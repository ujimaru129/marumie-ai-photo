"""セルフ写真館の「唇に指」のコマで、手と目線が写真のどちら側にあるかを数値で確かめる（目で見て判断を誤らないため）。

MediaPipe の顔のランドマーク（黒目の中心と目頭・目尻）と手のランドマークを使う。モデルは models/ に置く（git には入れない）:
  face_landmarker.task / hand_landmarker.task（Google の MediaPipe のモデル、Apache 2.0）

目線: 黒目の中心が目頭〜目尻のどこにあるか（写真の左端 0 〜 右端 1、0.5 が真ん中）。両目の平均。
  0.42 より小さければ「写真の左を見ている」、0.58 より大きければ「写真の右を見ている」
手: 人差し指の先が口に近い手の、手首が顔の中心より写真の左か右か

正解（隊長の判定）: 写真で見て「手が右・目線が左」。--raw は反転前の生成結果用（「手が左・目線が右」なら OK）

使い方: python3 gaze.py 画像...  → 1行ずつ「手 / 目線 / 判定」
"""
import os
import sys

import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision

HERE = os.path.dirname(os.path.abspath(__file__))


def detectors():
    face = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=os.path.join(HERE, "models", "face_landmarker.task")), num_faces=4))
    hand = vision.HandLandmarker.create_from_options(vision.HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=os.path.join(HERE, "models", "hand_landmarker.task")), num_hands=8))
    return face, hand


def gaze_ratio(lm):
    """両目の黒目の位置（写真の左 0 〜 右 1）"""
    out = []
    for iris, a, b in ((468, 33, 133), (473, 362, 263)):
        x0, x1 = sorted((lm[a].x, lm[b].x))
        out.append((lm[iris].x - x0) / max(x1 - x0, 1e-6))
    return float(np.mean(out))


def analyze(path, face, hand):
    img = mp.Image.create_from_file(path)
    faces = face.detect(img).face_landmarks
    hands = hand.detect(img).hand_landmarks
    best = None
    for f in faces:
        mouth = np.array([f[13].x, f[13].y])
        fw = abs(f[454].x - f[234].x)
        for h in hands:
            tip = np.array([h[8].x, h[8].y])
            d = np.linalg.norm(tip - mouth) / fw
            if best is None or d < best[0]:
                best = (d, f, h)
    if best is None or best[0] > 0.6:
        return None
    _, f, h = best
    cx = (f[454].x + f[234].x) / 2
    hand_side = "右" if h[0].x > cx else "左"
    g = gaze_ratio(f)
    gaze = "右" if g > 0.58 else "左" if g < 0.42 else "正面"
    return hand_side, g, gaze


def main():
    face, hand = detectors()
    raw = "--raw" in sys.argv
    want = ("左", "右") if raw else ("右", "左")
    for p in [a for a in sys.argv[1:] if a != "--raw"]:
        r = analyze(p, face, hand)
        if r is None:
            print(f"{os.path.basename(p):40s} 唇に指のコマが見つからない")
            continue
        hand_side, g, gaze = r
        ok = "OK" if (hand_side, gaze) == want else "NG"
        print(f"{os.path.basename(p):40s} 手={hand_side} 目線={gaze}({g:.2f}) {ok}")


if __name__ == "__main__":
    main()
