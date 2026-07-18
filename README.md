# 拾光 Study Flow

> 记录投入，看见成长 —— 本地优先的学习记录、统计与激励工具

**拾光** 帮助你记录每一次专注学习的投入时长，从时间、分类、趋势和目标多个维度复盘学习轨迹，用连续学习天数、每日目标和阶段性反馈形成正向激励。所有数据 100% 存储在本地，无需账号，无需网络，你完全拥有自己的数据。

当前版本：**0.4.0**

---

## ✨ 功能概览

### ⏱️ 专注计时
- **正计时模式**：开始、暂停、继续、完成，操作简单直观
- 选择学习分类（如专业学习、语言学习、阅读等），填写当前任务描述
- 计时状态持久化：刷新页面或重启应用后，运行中的计时不会丢失
- 完成后自动生成学习记录；小于 10 秒的误触记录不会保存

### 📊 数据统计
- **三个时间维度**：今日 / 近 7 天 / 近 30 天
- **关键指标**：总投入时长、日均投入、学习次数、最长单次专注
- **环形占比图**：按学习分类或具体项目名称查看时间分布
- **每日趋势柱状图**：直观对比每日投入变化，鼠标停留可查看准确时长
- **12 周学习热力图**：像 GitHub 贡献图一样展示学习密度
- **连续学习天数**与**每日目标完成度**追踪

### 📝 数据管理
- **完整历史记录**：按名称搜索，并可按分类、今天 / 近 7 天 / 近 30 天筛选
- **手动补记**：忘记计时？可以手动添加历史记录
- **编辑与删除**：修改已完成记录的分类、时间、时长；删除支持 5 秒撤销
- **分类管理**：支持新增、改名、换色、归档、恢复与合并，历史投入不会因归档而丢失
- **自动备份**：每天更新一份 JSON 快照并保留最近 14 天；设置页可查看和打开备份目录
- **JSON 导出/导入**：支持另存完整备份与恢复

### 🔒 本地优先 · 隐私至上
- **零网络请求**：不依赖服务器，不收集任何数据
- **SQLite 本地存储**（桌面应用）+ localStorage 兼容模式（浏览器开发）
- **软删除**：删除操作保留标记，数据可恢复
- **数据版本化**：每条记录包含设备标识、版本号和时间戳
- **变更队列**：为未来的多设备同步预留接口
- **单实例启动**：重复打开应用时聚焦已有窗口，不再启动第二套数据库连接

---

## 🛠 技术栈

| 层面 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript 5.7 |
| 构建工具 | Vite 6 |
| 桌面壳 | Tauri 2（Rust） |
| 本地数据库 | SQLite（`@tauri-apps/plugin-sql`） |
| 图标 | Lucide React |
| 可视化 | 纯 SVG（环形图、柱状图、热力图） |
| 样式 | CSS 变量 + 响应式布局 |
| 安装包 | NSIS（Windows x64） |

---

## 🚀 快速开始

### 浏览器开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器访问 `http://localhost:1420`。此模式使用 `localStorage` 存储数据。

### 桌面应用开发

需要安装 [Rust 工具链](https://www.rust-lang.org/tools/install) 及 Tauri 系统依赖。

```bash
npm install
npm run tauri dev
```

### 生产构建

```bash
# 前端构建
npm run build

# 桌面应用构建（生成 NSIS 安装包）
npm run tauri build
```

构建产物位于 `src-tauri/target/release/`，安装包位于 `release/`。

---

## 📁 项目结构

```
shiguang-study-flow/
├── index.html                  # SPA 入口
├── package.json                # NPM 配置
├── vite.config.ts              # Vite 构建配置
├── tsconfig*.json              # TypeScript 配置
│
├── src/                        # 前端源码
│   ├── main.tsx                # React 入口
│   ├── App.tsx                 # 根组件（路由、状态、数据操作）
│   ├── domain.ts               # 类型定义与常量
│   ├── styles.css              # 全局样式（CSS 变量 + 响应式）
│   ├── components/             # 通用组件
│   │   ├── Timer.tsx           # 专注计时器
│   │   ├── Charts.tsx          # 环形图、柱状图、热力图（SVG）
│   │   ├── SessionList.tsx     # 学习记录列表
│   │   └── Modal.tsx           # 通用弹窗
│   ├── views/                  # 页面视图
│   │   ├── TodayView.tsx       # 今日：计时 + 目标 + 最近记录
│   │   ├── AnalyticsView.tsx   # 统计：指标 + 图表 + 热力图
│   │   ├── HistoryView.tsx     # 记录：完整历史列表
│   │   └── SettingsView.tsx    # 设置：目标、分类、导入导出
│   └── lib/                    # 工具库
│       ├── database.ts         # SQLite 数据仓库（Tauri 桌面应用）
│       ├── backup.ts           # 自动备份命令的前端接口
│       ├── storage.ts          # localStorage 适配器（浏览器模式）
│       ├── stats.ts            # 统计计算（连续天数、趋势序列等）
│       ├── date.ts             # 日期格式化工具
│       └── demo.ts             # 演示数据生成
│
├── src-tauri/                  # Tauri 后端（Rust）
│   ├── Cargo.toml              # Rust 依赖
│   ├── tauri.conf.json         # Tauri 窗口/打包/安全配置
│   ├── capabilities/           # 权限声明
│   ├── icons/                  # 应用图标（各平台）
│   └── src/
│       ├── main.rs             # Rust 入口
│       ├── lib.rs              # Tauri 插件与命令初始化
│       └── backups.rs          # 自动备份、轮换和打开目录
│
├── dist/                       # 前端构建产物
├── release/                    # NSIS 安装包
└── DEVELOPMENT.md              # 开发文档（架构、数据模型、扩展方案）
```

---

## 🗄 数据架构

拾光采用 **领域驱动** 的四层架构：

```text
UI 组件
  ↓
应用状态与统计选择器
  ↓
领域模型（Session / Category / Settings / ActiveTimer）
  ↓
数据仓库（SqliteRepository / LocalStorageAdapter）
  ↓
SQLite + sync_changes（桌面应用）
```

UI 不直接操作数据库。桌面应用由 `src/lib/database.ts` 统一管理 SQLite 读写；浏览器开发模式由 `src/lib/storage.ts` 提供兼容的 localStorage 存储。

### SQLite 表结构

| 表 | 用途 | 同步 |
|--- |--- |--- |
| `study_sessions` | 学习记录 | 未来支持 |
| `categories` | 学习分类 | 未来支持 |
| `app_settings` | 每日目标等设置 | 未来支持 |
| `active_timer` | 当前运行计时 | 仅本机 |
| `sync_changes` | 增删改变更队列 | 同步入口 |
| `app_meta` | 数据库版本、设备 ID | 仅本机 |

所有参与同步的记录使用 UUID 主键，支持软删除和版本追踪。

### 数据迁移

从旧版本升级时，应用会自动检测 `localStorage` 中的 v1 数据，补齐版本号、设备 ID 和时间戳后迁移至 SQLite。0.4.0 会为旧数据库安全增加分类归档字段，旧数据不会删除。

---

## 🎨 设计理念

- **气质**：安静、清醒、克制
- **主色**：深棕墨色；强调色：陶土红与旧金；背景：低饱和纸张米白
- **字体**：标题使用衬线体（宋体 / Georgia）增强仪式感，正文使用系统无衬线体保证可读性
- **布局**：桌面端侧栏导航，移动端底部标签栏；所有点击目标 ≥ 44px
- **动画**：仅用于计时状态、进度变化和页面切换，克制而有意义

---

## 📱 Android 扩展计划

拾光的核心业务逻辑（领域类型、统计函数、React 组件）不依赖浏览器专属 API，为 Android 迁移做好了准备：

1. 运行 `tauri android init` 生成原生工程
2. 复用现有 SQLite 数据仓库、归档字段与同步变更队列
3. 接入通知插件实现专注结束提醒
4. 处理返回键、状态栏、安全区和后台计时验证
5. 可选账号 + 同步服务，消费 `sync_changes` 变更队列
6. 未登录时仍可完全离线使用

详见 [DEVELOPMENT.md](./DEVELOPMENT.md)。

---

## 📖 更多文档

- **[DEVELOPMENT.md](./DEVELOPMENT.md)**：完整开发文档，涵盖产品范围、技术架构、数据模型、SQLite 约定、迁移策略、视觉规范和验收标准。

---

## 📄 许可

MIT License

---

<p align="center">
  <sub>拾起每一寸光阴，让成长有迹可循。</sub>
</p>
