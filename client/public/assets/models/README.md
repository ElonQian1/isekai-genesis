# 模型资源指南

为了获得 3A 级的画质，请将 3D 模型 (.glb) 放入此目录。

## 目录结构

```
assets/models/
├── vegetation/
│   └── tree_pine.glb         (松树模型)
└── structures/
    ├── pavilion.glb          (凉亭模型)
    └── bridge.glb            (桥梁模型)
```

## 推荐资源站 (免费)

1.  **Sketchfab**: https://sketchfab.com/ (搜索 "low poly tree", "chinese pavilion")
2.  **Poly Haven**: https://polyhaven.com/models
3.  **Kenney Assets**: https://www.kenney.nl/assets (低多边形风格)

## 如何操作

1.  下载 `.glb` 或 `.gltf` 格式的模型。
2.  重命名文件以匹配代码中的约定：
    *   `tree_pine.glb`
    *   `pavilion.glb`
    *   `bridge.glb`
3.  放入对应的子目录。
4.  刷新游戏，原来的方块和圆柱体将自动变成精美的模型！

## 注意事项

*   **大小**: 尽量控制在 1MB - 5MB 之间，太大的模型会影响加载速度。
*   **原点**: 确保模型的原点 (0,0,0) 在底部中心，否则放置时会陷地或悬空。
*   **比例**: 如果模型太大或太小，可以在 `map_default.json` 中调整 `scale` 参数。
