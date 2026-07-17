# 拾光 Study Flow

本地优先的学习计时、统计与激励工具。

当前版本：0.1.5。Windows 正式构建使用无控制台窗口的 NSIS 安装包，并采用应用内自定义标题栏。

## 本地运行

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:1420`。生产构建使用：

```bash
npm run build
```

安装 Rust 工具链及 Tauri 系统依赖后，可以运行桌面应用：

```bash
npm run tauri dev
```

产品范围、架构、数据模型和 Android 扩展方案见 [DEVELOPMENT.md](./DEVELOPMENT.md)。
