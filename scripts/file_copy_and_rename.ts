/**
 * 文件复制并重命名脚本
 *
 * 功能说明：
 *   此脚本将源目录中的特定类型文件复制到目标目录并使用哈希值重命名。
 *   支持递归扫描子目录、文件类型过滤、复制或剪切模式。
 *
 * 使用方法：
 *   deno run --allow-read --allow-write --allow-env file_copy_and_rename.ts
 *
 * 配置说明：
 *   请在脚本顶部的 CONFIG 常量中修改源目录、目标目录、文件类型等配置。
 *
 * 安全说明：
 *   - 脚本会跳过隐藏文件/目录（以点开头的文件/目录）
 *   - 如果目标文件已存在，会自动跳过复制操作
 *   - 仅在复制成功后才会删除源文件（仅在剪切模式下）
 *   - 使用Blake3算法生成文件哈希值并用Base58编码作为新文件名
 *
 * 权限说明：
 *   --allow-read：允许读取源目录文件和计算哈希值
 *   --allow-write：允许向目标目录写入文件
 *   --allow-env：允许访问环境变量获取用户目录
 */

// 导入必要的模块
import { extname, join } from "jsr:@std/path@1.1.2";
import { crypto } from "jsr:@std/crypto@1.0.5";
import { encodeBase58 } from "jsr:@std/encoding@1.0.10";

/**
 * 配置常量
 * 请根据实际需求修改以下配置
 */

/** 源目录路径 */
const SOURCE_PATH = "./source"; // 修改为实际的源目录路径

/** 目标目录路径 */
const TARGET_PATH = "./target"; // 修改为实际的目标目录路径

/** 文件扩展名列表（小写，不含点号） */
const EXTENSIONS = ["mp4", "webm", "m4v"]; // 支持的文件类型

/** 是否在复制后删除源文件（剪切模式） */
const MOVE_AFTER_COPY = false; // true 为剪切模式，false 为复制模式

// 确保目标目录存在
await ensureDirectoryExists(TARGET_PATH);

/**
 * 获取文件扩展名
 */
function getFileExtension(filePath: string): string | null {
  const ext = extname(filePath);
  return ext ? ext.slice(1).toLowerCase() : null;
}

/**
 * 检查文件是否存在
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 计算文件的Blake3哈希值并使用Base58编码
 */
async function calculateFileHash(filePath: string): Promise<string> {
  const file = await Deno.open(filePath, { read: true });

  try {
    const readableStream = file.readable;
    const hash = await crypto.subtle.digest("BLAKE3", readableStream);

    // 使用Base58编码哈希值
    const hashArray = new Uint8Array(hash);
    return encodeBase58(hashArray);
  } finally {
    file.close();
  }
}

/**
 * 确保目录存在，如果不存在则创建
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await Deno.stat(dirPath);
  } catch {
    await Deno.mkdir(dirPath, { recursive: true });
    console.log(`创建目录: ${dirPath}`);
  }
}

/**
 * 复制单个文件
 */
async function copySingleFile(
  sourceFile: string,
  targetDir: string,
  moveAfterCopy: boolean,
): Promise<void> {
  console.log(`处理文件: ${sourceFile}`);

  // 1. 计算文件哈希值
  const hash = await calculateFileHash(sourceFile);

  // 2. 获取文件扩展名
  const extension = getFileExtension(sourceFile);

  // 3. 构建目标文件路径（哈希值 + 原始扩展名）
  const targetFileName = extension ? `${hash}.${extension}` : hash;
  const targetPath = join(targetDir, targetFileName);

  // 4. 检查目标文件是否已存在
  if (await fileExists(targetPath)) {
    console.log(`跳过: 目标文件已存在 ${targetPath}`);
    return;
  }

  // 5. 确保目标目录存在
  await ensureDirectoryExists(targetDir);

  // 6. 复制文件
  await Deno.copyFile(sourceFile, targetPath);
  console.log(`复制成功: ${sourceFile} -> ${targetPath}`);

  // 7. 如果启用了剪切模式，复制成功后删除源文件
  if (moveAfterCopy) {
    await Deno.remove(sourceFile);
    console.log(`删除源文件: ${sourceFile}`);
  }
}

/**
 * 递归扫描并处理文件
 */
async function scanAndCopyFiles(
  dirPath: string,
  targetPath: string,
  extensions: string[],
  moveAfterCopy: boolean,
): Promise<void> {
  const entries = Deno.readDir(dirPath);

  for await (const entry of entries) {
    // 跳过隐藏文件/目录
    if (entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory) {
      // 递归处理子目录
      await scanAndCopyFiles(fullPath, targetPath, extensions, moveAfterCopy);
      continue;
    }

    if (entry.isFile) {
      // 检查文件扩展名
      const ext = getFileExtension(fullPath);
      if (!ext || !extensions.includes(ext)) {
        continue;
      }
      // 处理匹配的文件
      await copySingleFile(fullPath, targetPath, moveAfterCopy);
    }
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log("=== 文件复制并重命名脚本 ===");
  console.log(`源目录: ${SOURCE_PATH}`);
  console.log(`目标目录: ${TARGET_PATH}`);
  console.log(`文件类型: ${EXTENSIONS.join(", ")}`);
  console.log(`操作模式: ${MOVE_AFTER_COPY ? "剪切" : "复制"}`);

  console.log("\n开始处理文件...");

  // 开始扫描和复制文件
  await scanAndCopyFiles(SOURCE_PATH, TARGET_PATH, EXTENSIONS, MOVE_AFTER_COPY);

  console.log("\n=== 处理完成 ===");
  console.log(`文件${MOVE_AFTER_COPY ? "剪切" : "复制"}操作已成功完成！`);
}

// 运行主函数
await main();
