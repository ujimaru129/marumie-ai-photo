"""画像 AI の呼び出し（検証用）。

キーはこのスクリプトでは持たない。Claude Code のクラウド環境では、ネットワークのプロキシが
「Network secrets」に登録したキーを自動で付ける（Gemini は x-goog-api-key、Meta は Authorization: Bearer）。
手元のパソコンで動かすときは、環境変数 GEMINI_API_KEY / META_MODEL_API_KEY を設定すれば、それを使う。

どのモデルも「写真1枚＋指示文 → 画像1枚」の同じ形で呼べるようにしてある（スタイルごとにモデルを差し替えるため）。
"""
import base64
import json
import os
import time
import urllib.error
import urllib.request
import uuid

GEMINI_MODEL = "gemini-nano-banana-2.1"
META_MODEL = "muse-image-1.0"

# 1枚あたりの費用（米ドル、2026-11 時点の公式価格。docs/AIモデル調査_2026-11.md）
PRICE_USD = {"gemini": 0.0336, "meta": 0.01}


def _post(req, timeout):
    t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r), round(time.time() - t, 1), None
    except urllib.error.HTTPError as e:
        return None, round(time.time() - t, 1), f"HTTP {e.code}: {e.read()[:400].decode('utf-8', 'replace')}"
    except Exception as e:  # タイムアウトなど
        return None, round(time.time() - t, 1), f"{type(e).__name__}: {e}"


def gemini(image_bytes, prompt, timeout=180):
    """Nano Banana 2.1 で編集する。戻り値: (画像のバイト列 or None, 情報の dict)"""
    body = {
        "contents": [{"parts": [
            {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(image_bytes).decode()}},
            {"text": prompt},
        ]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    headers = {"Content-Type": "application/json"}
    if os.environ.get("GEMINI_API_KEY"):
        headers["x-goog-api-key"] = os.environ["GEMINI_API_KEY"]
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
        data=json.dumps(body).encode(), headers=headers)
    r, sec, err = _post(req, timeout)
    info = {"model": "gemini", "sec": sec}
    if err:
        return None, {**info, "status": "error", "detail": err}
    cand = (r.get("candidates") or [{}])[0]
    for p in cand.get("content", {}).get("parts", []):
        d = p.get("inlineData") or p.get("inline_data")
        if d:
            return base64.b64decode(d["data"]), {**info, "status": "ok", "usage": r.get("usageMetadata")}
    # 画像が返らない＝安全チェックなどで止められた
    return None, {**info, "status": "blocked",
                  "detail": json.dumps({"finishReason": cand.get("finishReason"),
                                        "promptFeedback": r.get("promptFeedback")}, ensure_ascii=False)}


def meta(image_bytes, prompt, timeout=300):
    """Muse Image で編集する（OpenAI Images API と同じ形の /v1/images/edits）。"""
    b = uuid.uuid4().hex
    parts = []

    def field(name, value):
        parts.append(f'--{b}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())

    field("model", META_MODEL)
    field("prompt", prompt)
    field("n", "1")
    parts.append(f'--{b}\r\nContent-Disposition: form-data; name="image"; filename="in.jpg"\r\n'
                 f'Content-Type: image/jpeg\r\n\r\n'.encode() + image_bytes + b"\r\n")
    parts.append(f"--{b}--\r\n".encode())
    # クラウド環境ではプロキシが本物のキーに置き換える
    key = os.environ.get("META_MODEL_API_KEY", "proxy-injected")
    req = urllib.request.Request("https://api.meta.ai/v1/images/edits", data=b"".join(parts), headers={
        "Content-Type": f"multipart/form-data; boundary={b}", "Authorization": f"Bearer {key}"})
    r, sec, err = _post(req, timeout)
    info = {"model": "meta", "sec": sec}
    if err:
        return None, {**info, "status": "error", "detail": err}
    d = (r.get("data") or [{}])[0]
    if d.get("b64_json"):
        return base64.b64decode(d["b64_json"]), {**info, "status": "ok", "usage": r.get("usage")}
    return None, {**info, "status": "blocked", "detail": json.dumps(r, ensure_ascii=False)[:400]}


MODELS = {"gemini": gemini, "meta": meta}
