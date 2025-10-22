/**
 * 压缩并删除脚本
 *
 * 功能说明：
 *   此脚本将当前目录下所有一级子目录和文件使用7z压缩成压缩包，
 *   在压缩完成后自动删除对应的源文件或目录。
 *
 * 使用前提：
 *   - 系统中已安装7z压缩软件
 *   - Deno已安装在系统中
 *
 * 使用方法：
 *   运行以下命令执行脚本：
 *   deno run --allow-run --allow-read --allow-write --allow-env compress_and_delete.ts
 *
 * 安全说明：
 *   - 脚本会跳过隐藏文件/目录（以点开头的文件/目录）
 *   - 脚本会跳过所有TypeScript文件（.ts扩展名）
 *   - 如压缩文件已存在，会自动跳过压缩操作
 *   - 仅在压缩成功后才会删除源文件/目录
 *   - 脚本会智能检测7z安装位置，包括常见安装目录和用户目录
 *
 * 权限说明：
 *   --allow-run: 允许执行7z外部命令
 *   --allow-read: 允许读取文件系统信息
 *   --allow-write: 允许删除源文件/目录
 *   --allow-env: 允许访问用户目录环境变量
 */

// 导入path模块用于路径处理
import { join } from "jsr:@std/path@^1.1.2";
import { exists } from "jsr:@std/fs@^1.0.19/exists";

/**
 * 获取系统中常见的7z安装路径
 * @returns {string[]} 可能的7z安装路径数组
 */
function get7zPaths(): string[] {
  // 常见的安装位置
  const commonPaths = [
    "C:\\Program Files\\7-Zip\\7z.exe",
    "C:\\Program Files (x86)\\7-Zip\\7z.exe",
    "C:\\7-Zip\\7z.exe",
  ];

  // 添加用户特定的路径
  const userProfile = Deno.env.get("USERPROFILE");
  if (userProfile) {
    commonPaths.push(`${userProfile}\\AppData\\Local\\Programs\\7-Zip\\7z.exe`);
    commonPaths.push(`${userProfile}\\7-Zip\\7z.exe`);
  }

  return commonPaths;
}

/**
 * 检查指定路径的7z可执行文件是否可用
 * @param {string} sevenZipPath - 7z可执行文件的完整路径
 * @returns {Promise<boolean>} 返回true表示该路径的7z可用，false表示不可用
 */
async function test7zPath(sevenZipPath: string): Promise<boolean> {
  try {
    const command = new Deno.Command(sevenZipPath, {
      args: ["--help"],
      stdout: "null",
      stderr: "null",
    });

    const status = await command.output();
    return status.success;
  } catch {
    return false;
  }
}

/**
 * 检查7z可执行程序是否可用
 *
 * @returns {Promise<string>} 返回找到的7z路径
 */
async function check7zAvailability(): Promise<string> {
  console.log("正在智能检测7z安装...");

  // 首先尝试直接运行7z命令（检查PATH）
  if (await test7zPath("7z")) {
    console.log("在PATH中找到7z命令");
    return "7z";
  }

  // 如果直接命令不可用，遍历常见安装位置
  const possiblePaths = get7zPaths();
  console.log(`正在检查 ${possiblePaths.length} 个可能的7z安装位置...`);

  for (const path of possiblePaths) {
    console.log(`检查: ${path}`);
    if (await test7zPath(path)) {
      console.log(`找到可用的7z: ${path}`);
      return path;
    }
  }

  console.error("错误: 未找到7z可执行程序。");
  console.error("请确保7z已安装：");
  console.error("1. 从 https://www.7-zip.org/ 下载并安装7-Zip");
  console.error("2. 或者使用包管理器安装: winget install 7zip.7zip");
  throw new Error("7z未安装");
}

/**
 * 压缩指定的文件或目录
 *
 * @param {string} itemPath - 要压缩的文件或目录路径
 * @param {string} outputPath - 输出的压缩文件路径
 * @param {string} sevenZipPath - 7z可执行文件路径
 * @returns {Promise<boolean>} 返回true表示压缩成功，false表示压缩失败
 */
async function compressItem(
  itemPath: string,
  outputPath: string,
  sevenZipPath: string
): Promise<boolean> {
  console.log(`正在压缩: ${itemPath} -> ${outputPath}`);

  // 执行7z压缩命令
  // 参数说明：
  // - sevenZipPath: 7z可执行程序路径
  // - "a": 添加到压缩文件的命令
  // - outputPath: 输出的压缩文件路径
  // - itemPath: 要压缩的文件或目录路径
  const command = new Deno.Command(sevenZipPath, {
    args: ["a", outputPath, itemPath],
    stdout: "piped", // 捕获标准输出
    stderr: "piped", // 捕获错误输出
  });

  // 等待压缩进程完成并获取状态
  const output = await command.output();

  // 检查压缩是否成功
  if (!output.success) {
    // 输出错误信息
    console.error(`压缩失败: ${new TextDecoder().decode(output.stderr)}`);
    return false;
  }

  console.log(`压缩成功: ${outputPath}`);
  return true;
}

/**
 * 删除指定的文件或目录
 *
 * @param {string} itemPath - 要删除的文件或目录路径
 * @param {boolean} isDirectory - 指定是否为目录（如果是目录，需要递归删除）
 * @returns {Promise<void>}
 */
async function deleteItem(
  itemPath: string,
  isDirectory: boolean
): Promise<void> {
  console.log(`正在删除: ${itemPath}`);

  // 删除文件或目录
  // 当isDirectory为true时，使用recursive选项递归删除目录
  await Deno.remove(itemPath, { recursive: isDirectory });

  console.log(`删除成功: ${itemPath}`);
}

// 使用顶层await检查7z是否可用并获取路径
const sevenZipPath = await check7zAvailability();
console.log(`7z检测成功: ${sevenZipPath}`);

// 使用顶层await简化执行流程，无需额外的main函数调用
console.log("=== 压缩并删除脚本开始执行 ===");

// 获取当前工作目录
const currentDir = Deno.cwd();
console.log(`当前工作目录: ${currentDir}`);

// 读取并收集当前目录下的所有非隐藏项目
const items: Deno.DirEntry[] = [];
for await (const item of Deno.readDir(currentDir)) {
  // 跳过所有TypeScript文件和隐藏文件/目录
  // 隐藏文件/目录在Windows和Unix系统中通常以点开头
  if (item.name.endsWith(".ts") || item.name.startsWith(".")) {
    continue;
  }
  items.push(item);
}

console.log(`找到 ${items.length} 个项目需要处理`);

// 处理每个找到的项目
for (const item of items) {
  // 构建完整的源路径和目标压缩文件路径
  const itemPath = join(currentDir, item.name);
  const outputPath = join(currentDir, `${item.name}.7z`);

  // 检查输出的压缩文件是否已存在
  if (await exists(outputPath)) {
    console.log(`跳过: 压缩文件 ${outputPath} 已存在`);
    continue; // 如果文件已存在，跳过当前项目处理
  }

  // 压缩当前项目
  const compressSuccess = await compressItem(
    itemPath,
    outputPath,
    sevenZipPath
  );

  // 只有压缩成功后才删除源文件或目录
  if (compressSuccess) {
    await deleteItem(itemPath, item.isDirectory);
  } else {
    console.log(`源项 ${itemPath} 未被删除，因为压缩失败。`);
  }

  // 输出分隔线，提高输出日志可读性
  console.log("---");
}

console.log("所有项目处理完成!");
console.log("=== 压缩并删除脚本执行结束 ===");
