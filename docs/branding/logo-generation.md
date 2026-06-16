# STEPMOTECH Logo Generation (Qwen / DashScope)

## 1) 前置条件

- 你需要可用的 DashScope 密钥，并在本机终端中手动设置：
  - PowerShell: `$env:DASHSCOPE_API_KEY="<your_key>"`
  - CMD: `set DASHSCOPE_API_KEY=<your_key>`
- 可选模型名（默认 `qwen-image`）：
  - PowerShell: `$env:QWEN_IMAGE_MODEL="qwen-image"`

## 2) 生成命令

- 使用项目脚本直接生成：
  - `pnpm logo:generate`

可选参数：

- `node scripts/generate-qwen-logo.mjs --model qwen-image --size 1536*1024 --prompt-file docs/branding/logo-qwen-prompt.txt --output public/brand/stepmotech-logo-qwen.png`

## 3) 输出文件

- 默认输出：`public/brand/stepmotech-logo-qwen.png`
- 当前站点已接入 logo 位于：`public/brand/stepmotech-logo-v2.svg`
- 如需切换为模型生成稿，可将头部 logo 路径替换为 `stepmotech-logo-qwen.png`

## 4) 提示词来源

- 参考旧站 logo：`https://www.vexmotor.com/img/logo-1748329863.jpg`
- 提示词文件：`docs/branding/logo-qwen-prompt.txt`
