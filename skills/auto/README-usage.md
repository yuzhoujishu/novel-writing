# /novel:auto 使用指南

## 快速开始

```bash
# 从当前 activeChapter 开始写5章
/novel:auto

# 写3章
/novel:auto --batch=3

# 覆盖起始章节（从第6章开始写5章）
/novel:auto --start=6

# 只写2章，从第4章开始
/novel:auto --batch=2 --start=4
```

## 批次执行流程

```
1. 预检查 → pre-batch-verify Hook：验证项目和 outline 存在
        ↓
2. 加载上下文 → 一次性读取所有状态文件
   (outline, characters, world, style, beats, 上1-2章)
        ↓
3. 顺序写章节（每章）
        ↓ 每章后
   + pre-chapter-chinese-count Hook：≥3000 中文字符检查
   + post-chapter-state-update Hook：实时更新状态文件
        ↓
4. 最终状态同步（meta / outline / beats）
        ↓
5. 汇总报告
```

## 进度跟踪

批次执行中，每章完成后会看到：

```
Chapter 3 written: 3542 words | Status: draft | Next: Chapter 4/5
Chapter 4 written: 3108 words | Status: draft | Next: Chapter 5/5
Chapter 5 written: 3890 words | Status: draft | Done.
```

批次完成后：

```
=== Batch Complete ===
Chapters written: Chapter 3 (3542w), Chapter 4 (3108w), Chapter 5 (3890w)
Total words added: 10540
Active chapter: 6
Time elapsed: 45.2s
State files updated:
  - meta.json
  - outline.json
  - beats.json
Progress: 5 / 15 chapters (33.3%)
```

## 提前中止场景

| 场景 | 处理方式 |
|------|----------|
| 字数不足被 Hook 阻止 | 中止，当前章之前的结果保留，可 `--start=N` 恢复 |
| outline 章节不足5章 | 只写存在的章节，报告中注明 |
| 跳过已完成的章节 | 警告后继续到下一个 outline 章节 |
| 无 outline 章节可写 | 报告"All chapters drafted" |

## Hook 检查点

| Hook | 何时触发 | 作用 |
|------|----------|------|
| `pre-batch-verify` | state-manager 调用前 | 验证项目和大纲存在 |
| `pre-chapter-chinese-count` | 写章节文件前 | 强制 ≥3000 中文字符 |
| `post-chapter-state-update` | 写章节文件后 | 实时更新 outline/meta/beats |
| `stop-state-sync` | 会话结束时 | 字数一致性检查 |

## 状态文件更新时机

- **`outline.json`**：每章后（Hook 实时）+ 批次后（最终确认）
- **`meta.json`**：每章后（`currentWordCount += delta`，Hook）+ 批次后（`activeChapter` 前移）
- **`beats.json`**：每章后（Hook）+ 批次后（标记全部written）
- **`style-profile.json`**：新一幕首章写完后自动提取（或询问是否更新）

## 恢复中断的批次

某章失败后，可使用 `--start=N` 恢复：

```
[ABORT] Chapter 4 failed: insufficient Chinese characters
Completed: Chapter 3 (3542w)
Retry: /novel:auto --start=4 --batch=2
```
