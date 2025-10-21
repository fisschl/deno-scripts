# Deno 实用脚本集

这是一个用Deno编写的实用脚本集合，提供了文件处理和压缩相关的常用功能。

## 📋 项目概述

本项目包含多个Deno脚本，用于简化日常文件管理任务：

- **文件压缩与删除**：自动将文件/目录压缩为7z格式并可选删除源文件
- **文件复制与重命名**：根据文件内容哈希值批量重命名复制文件

## 🛠️ 前提条件

- **Deno**：确保已安装Deno运行时环境
  - 下载地址：https://deno.com/
  - 安装命令：`winget install denoland.deno`（Windows）或使用其他包管理器

- **7-Zip**：用于运行压缩脚本
  - 下载地址：https://www.7-zip.org/
  - 安装命令：`winget install 7zip.7zip`（Windows）

## 📁 脚本列表

### 1. compress_and_delete.ts

**功能说明**：
- 将当前目录下所有一级子目录和文件使用7z压缩成压缩包
- 压缩完成后自动删除对应的源文件或目录
- 智能检测7z安装位置

**安全特性**：
- 跳过隐藏文件/目录（以点开头）
- 跳过TypeScript文件（.ts扩展名）
- 压缩文件已存在时自动跳过
- 仅在压缩成功后才删除源文件/目录

**使用方法**：
```bash
deno run --allow-run --allow-read --allow-write --allow-env scripts/compress_and_delete.ts
```

### 2. file_copy_and_rename.ts

**功能说明**：
- 将源目录中的特定类型文件复制到目标目录
- 使用Blake3哈希值和Base58编码重命名文件
- 支持递归扫描子目录
- 支持文件类型过滤
- 支持复制或剪切模式

**安全特性**：
- 跳过隐藏文件/目录
- 目标文件已存在时自动跳过
- 仅在复制成功后才删除源文件（剪切模式）

**配置方法**：
修改脚本顶部的常量：
- `SOURCE_PATH`：源目录路径
- `TARGET_PATH`：目标目录路径
- `EXTENSIONS`：要处理的文件扩展名数组
- `MOVE_AFTER_COPY`：是否在复制后删除源文件

**使用方法**：
```bash
deno run --allow-read --allow-write --allow-env scripts/file_copy_and_rename.ts
```

## 📦 安装依赖

这些脚本使用了Deno标准库中的包，首次运行时会自动下载依赖。

主要依赖：
- `@std/path`：路径处理
- `@std/crypto`：文件哈希计算
- `@std/encoding`：Base58编码

## 🔒 权限说明

### compress_and_delete.ts 所需权限
- `--allow-run`：执行7z外部命令
- `--allow-read`：读取文件系统信息
- `--allow-write`：删除源文件/目录
- `--allow-env`：访问用户目录环境变量

### file_copy_and_rename.ts 所需权限
- `--allow-read`：读取源目录文件和计算哈希值
- `--allow-write`：向目标目录写入文件
- `--allow-env`：访问环境变量

## 📝 使用提示

1. **备份重要数据**：在运行删除或移动操作前，请确保已备份重要文件

2. **测试运行**：建议先在小批量文件上测试脚本功能

3. **权限控制**：严格遵循最小权限原则，仅授予脚本必要的权限

4. **自定义配置**：根据实际需求修改脚本中的配置参数

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进这些脚本！

## 📄 许可证

本项目采用MIT许可证 - 详情请查看[LICENSE](LICENSE)文件