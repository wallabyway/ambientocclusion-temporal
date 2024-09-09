# TSSAO (Temporal Screen-Space Ambient Occlusion)

TSSAO simulates realistic shadows in real-time rendering by approximating ambient light occlusion. It uses temporal accumulation to reduce noise after the camera stops moving.

![TSSAO Demo Screenshot](https://github.com/user-attachments/assets/cb1dff04-7122-4a61-8531-c56dd00ff8c1)

## Features
- This demo is based on the GitHub project n8ao and uses the accumulation flag for temporal stability.
- power-saving by stopping animation after 16 frames of inactivity.
- Supports loading of glTF formats in the glb folder, containing MeshOpt compression.
- Provides VSM shadow maps and SMAA anti-aliasing.

---

- DEMO1: https://wallabyway.github.io/ambientocclusion-temporal/
- DEMO2: https://wallabyway.github.io/ambientocclusion-temporal/#advanced-rvt2.glb
