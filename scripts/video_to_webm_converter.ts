/**
 * 视频转WebM转换脚本
 *
 * 功能说明：
 *   此脚本递归扫描当前目录及所有子目录，将指定格式的视频文件转换为WebM格式。
 *   支持AVI、MOV、MTS、VOB、MPG、3GP、WMV等格式的转换。
 *   转换是原地的，成功后自动删除源文件。
 *   支持深层嵌套的目录结构。
 *
 * 使用方法：
 *   deno run --allow-run --allow-read --allow-write --allow-env video_to_webm_converter.ts
 *
 * 支持的输入格式：
 *   - AVI (.avi)
 *   - QuickTime (.mov)
 *   - AVCHD (.mts)
 *   - DVD Video (.vob)
 *   - MPEG (.mpg, .mpeg)
 *   - 3GPP (.3gp)
 *   - Windows Media (.wmv)
 *
 * 输出格式：
 *   - WebM (.webm) - AV1视频编码，Opus音频编码
 *
 * 转换参数：
 *   - 视频编码器: AV1 (libaom-av1)
 *   - 音频编码器: Opus
 *   - 质量设置: 中等质量 (CRF 33)
 *   - 速度设置: 中等速度 (cpu-used 4)
 *
 * 递归扫描说明：
 *   - 递归扫描当前目录及所有子目录
 *   - 自动处理深层嵌套的文件结构
 *   - 显示每个被扫描的目录路径
 *   - 跳过隐藏文件和目录
 *
 * 安全说明：
 *   - 脚本会跳过隐藏文件和目录
 *   - 跳过已经是WebM格式的文件
 *   - 仅在转换成功后删除源文件
 *   - 转换失败时保留源文件
 *
 * 权限说明：
 *   --allow-run: 允许执行ffmpeg命令
 *   --allow-read: 允许读取文件和目录
 *   --allow-write: 允许删除源文件
 *   --allow-env: 允许访问环境变量查找ffmpeg
 */

// 导入必要的模块
import { extname, join } from "jsr:@std/path@1.1.2";

/**
 * 配置常量
 */

/** 当前工作目录 */
const CURRENT_DIR = Deno.cwd();

/** 支持的输入文件扩展名（小写） */
const SUPPORTED_EXTENSIONS = [
  "avi",
  "mov",
  "mts",
  "vob",
  "mpg",
  "mpeg",
  "3gp",
  "wmv",
];

/** 输出格式 */
const OUTPUT_EXTENSION = "webm";

/** 转换参数（使用双层数组避免格式化问题） */
const CONVERSION_PARAMS = [
  ["-c:v", "libaom-av1"],
  ["-c:a", "libopus"],
  ["-crf", "33"],
  ["-b:v", "0"],
  ["-b:a", "128k"],
  ["-cpu-used", "4"],
  ["-threads", "4"],
  ["-tile-columns", "2"],
  ["-row-mt", "1"],
];

// 检测可用的FFmpeg路径
const DETECTED_FFMPEG = await checkFFmpegAvailability();

/**
 * 获取文件扩展名（小写）
 */
function getFileExtension(filePath: string): string | null {
  const ext = extname(filePath);
  return ext ? ext.slice(1).toLowerCase() : null;
}

/**
 * 展平转换参数数组
 */
function flattenConversionParams(): string[] {
  return CONVERSION_PARAMS.flat();
}

/**
 * 检查文件是否存在
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

/**
 * 检查FFmpeg是否可用
 */
async function checkFFmpegAvailability(): Promise<string> {
  console.log("检测FFmpeg...");

  try {
    const command = new Deno.Command("ffmpeg", {
      args: ["-version"],
      stdout: "null",
      stderr: "null",
    });

    const status = await command.output();
    if (status.success) {
      console.log("✅ FFmpeg检测成功");
      return "ffmpeg";
    }
  } catch {
    // 继续尝试其他可能的FFmpeg路径
  }

  // 尝试常见的FFmpeg安装路径
  const possiblePaths = [
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
  ];

  const userProfile = Deno.env.get("USERPROFILE");
  if (userProfile) {
    possiblePaths.push(`${userProfile}\\ffmpeg\\bin\\ffmpeg.exe`);
    possiblePaths.push(
      `${userProfile}\\AppData\\Local\\ffmpeg\\bin\\ffmpeg.exe`
    );
  }

  console.log("检查常见的FFmpeg安装路径...");

  for (const path of possiblePaths) {
    try {
      const command = new Deno.Command(path, {
        args: ["-version"],
        stdout: "null",
        stderr: "null",
      });

      const status = await command.output();
      if (status.success) {
        console.log(`✅ 找到FFmpeg: ${path}`);
        return path;
      }
    } catch {
      continue;
    }
  }

  console.error("❌ 错误: 未找到FFmpeg可执行程序。");
  console.error("请确保FFmpeg已安装：");
  console.error("1. 从 https://ffmpeg.org/download.html 下载并安装");
  console.error("2. 或者使用包管理器安装:");
  console.error("   - Windows: winget install Gyan.FFmpeg");
  console.error("   - macOS: brew install ffmpeg");
  console.error("   - Linux: sudo apt install ffmpeg");

  throw new Error("FFmpeg未安装");
}

/**
 * 转换单个视频文件
 */
async function convertVideoFile(inputPath: string): Promise<void> {
  const inputExt = getFileExtension(inputPath);
  if (!inputExt || !SUPPORTED_EXTENSIONS.includes(inputExt)) {
    return;
  }

  // 构建输出文件路径
  const outputPath = inputPath.replace(
    new RegExp(`\\.${inputExt}$`, "i"),
    `.${OUTPUT_EXTENSION}`
  );

  // 检查输出文件是否已存在
  if (await fileExists(outputPath)) {
    console.log(`⏭️  跳过: 输出文件已存在 ${outputPath}`);
    return;
  }

  console.log(`🎬 转换: ${inputPath} -> ${outputPath}`);

  // 构建FFmpeg命令
  const args = [
    "-i",
    inputPath, // 输入文件
    ...flattenConversionParams(), // 转换参数
    "-y", // 覆盖输出文件
    outputPath, // 输出文件
  ];

  const command = new Deno.Command(DETECTED_FFMPEG, {
    args,
    stdout: "piped",
    stderr: "piped",
  });

  console.log(`⚙️  执行命令: ${DETECTED_FFMPEG} ${args.join(" ")}`);

  // 执行转换
  const process = command.spawn();
  const { success, stderr } = await process.output();

  if (!success) {
    const errorMsg = new TextDecoder().decode(stderr);
    throw new Error(`FFmpeg转换失败: ${errorMsg}`);
  }

  console.log(`✅ 转换成功: ${outputPath}`);

  // 验证输出文件
  const outputStat = await Deno.stat(outputPath);
  if (outputStat.size === 0) {
    throw new Error("输出文件为空");
  }

  // 删除源文件
  console.log(`🗑️  删除源文件: ${inputPath}`);
  await Deno.remove(inputPath);
  console.log(`✅ 源文件已删除: ${inputPath}`);
}

/**
 * 递归扫描目录并转换视频文件
 */
async function scanDirectoryRecursively(dirPath: string): Promise<void> {
  console.log(`📂 扫描目录: ${dirPath}`);

  for await (const entry of Deno.readDir(dirPath)) {
    // 跳过隐藏文件和目录
    if (entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory) {
      // 递归处理子目录
      await scanDirectoryRecursively(fullPath);
    } else if (entry.isFile) {
      const ext = getFileExtension(fullPath);

      // 检查是否为支持的格式
      if (ext && SUPPORTED_EXTENSIONS.includes(ext)) {
        await convertVideoFile(fullPath);
      } else if (ext === OUTPUT_EXTENSION) {
        console.log(`⏭️  跳过: 已经是WebM格式 ${fullPath}`);
      }
    }
  }
}

/**
 * 扫描并转换当前目录及子目录中的视频文件
 */
async function scanAndConvertVideos(): Promise<void> {
  console.log(`📁 开始递归扫描目录: ${CURRENT_DIR}`);
  console.log(`🎯 支持的格式: ${SUPPORTED_EXTENSIONS.join(", ")}`);

  await scanDirectoryRecursively(CURRENT_DIR);
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log("=== 视频转WebM转换脚本 ===");

  console.log(`使用FFmpeg: ${DETECTED_FFMPEG}`);
  console.log("\n开始转换视频文件...");

  // 扫描并转换文件
  await scanAndConvertVideos();

  console.log("\n🎉 转换完成！所有视频文件已成功转换为WebM格式。");
}

// 运行主函数
await main();
