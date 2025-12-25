# 纹理资源指南

为了获得 3A 级的画质，请将 PBR 纹理放入此目录。

## 目录结构

```
assets/textures/
├── ground/
│   ├── grass_albedo.jpg      (颜色)
│   ├── grass_normal.jpg      (法线 - 增加凹凸感)
│   ├── grass_roughness.jpg   (粗糙度 - 控制反光)
│   └── grass_ao.jpg          (环境光遮蔽 - 增加阴影细节)
└── environment/
    └── sky.env               (环境光贴图)
```

## 推荐资源站 (免费)

1.  **Poly Haven**: https://polyhaven.com/textures
2.  **AmbientCG**: https://ambientcg.com/

## 如何操作

1.  下载一个 "Grass" 或 "Ground" 的材质包 (推荐 2K 分辨率)。
2.  重命名文件以匹配代码中的约定：
    *   `*_Color.jpg` -> `grass_albedo.jpg`
    *   `*_NormalGL.jpg` -> `grass_normal.jpg`
    *   `*_Roughness.jpg` -> `grass_roughness.jpg`
    *   `*_AmbientOcclusion.jpg` -> `grass_ao.jpg`
3.  放入 `client/public/assets/textures/ground/` 目录。
4.  刷新游戏，地面将自动变成高清材质！
