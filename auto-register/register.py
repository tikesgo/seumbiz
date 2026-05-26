import argparse
import json
import re
import sys
import time
from pathlib import Path

import pyautogui


BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"


def load_config():
    with CONFIG_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def normalize_pin(value):
    return re.sub(r"\D", "", value or "")


def validate_point(name, point):
    x = point.get("x")
    y = point.get("y")

    if not isinstance(x, (int, float)) or not isinstance(y, (int, float)) or x <= 0 or y <= 0:
        raise ValueError(f"{name} coordinates are not set. Update config.json first.")

    return int(x), int(y)


def countdown(seconds):
    for remaining in range(seconds, 0, -1):
        print(f"{remaining}초 후 자동 입력을 시작합니다. 삼성 플로우 창을 준비해주세요.")
        time.sleep(1)


def move_to_point(label, step, total_steps, point, duration):
    print(f"[{step}/{total_steps}] {label}으로 이동: x={point[0]} y={point[1]}")
    pyautogui.moveTo(point[0], point[1], duration=duration)
    print("클릭 직전 1초 대기")
    time.sleep(1)


def register_pin(config, pin, test_mode=False):
    pin_input = validate_point("pinInputClick", config["pinInputClick"])
    register_button = validate_point("registerButtonClick", config["registerButtonClick"])

    countdown_seconds = int(config.get("countdownSeconds", 3))
    delay_seconds = float(config.get("delaySeconds", 0.4))
    type_interval = float(config.get("typeIntervalSeconds", 0.01))
    move_duration = float(config.get("moveDurationSeconds", 1))
    clear_before_type = bool(config.get("clearBeforeType", True))

    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = delay_seconds

    countdown(countdown_seconds)

    move_to_point("입력칸", 1, 2, pin_input, move_duration)
    if test_mode:
        print("테스트 모드: 입력칸 클릭, Ctrl+A, 핀번호 입력은 실행하지 않습니다.")
    else:
        pyautogui.click()
        if clear_before_type:
            print("기존 입력값 선택: Ctrl+A")
            pyautogui.hotkey("ctrl", "a")
        print("핀번호 입력")
        pyautogui.write(pin, interval=type_interval)

    move_to_point("등록 버튼", 2, 2, register_button, move_duration)
    if test_mode:
        print("테스트 모드: 등록 버튼 클릭은 실행하지 않습니다.")
    else:
        pyautogui.click()

    print("완료: 테스트 모드" if test_mode else "완료: 입력/클릭 자동화가 끝났습니다.")


def parse_args():
    parser = argparse.ArgumentParser(description="Samsung Flow screen automation for one Lotte mobile gift card pin.")
    parser.add_argument("--pin", help="등록할 16자리 핀번호")
    parser.add_argument("--test", action="store_true", help="입력/클릭 없이 마우스 이동 위치만 확인합니다.")
    return parser.parse_args()


def main():
    args = parse_args()
    pin = normalize_pin(args.pin or "0000000000000000")

    if not args.test and len(pin) != 16:
        print("핀번호는 숫자 16자리여야 합니다.", file=sys.stderr)
        return 1

    try:
        config = load_config()
        register_pin(config, pin, test_mode=args.test)
    except KeyboardInterrupt:
        print("사용자 취소")
        return 130
    except pyautogui.FailSafeException:
        print("FAILSAFE 작동: 마우스가 화면 좌상단으로 이동해 자동화를 중지했습니다.", file=sys.stderr)
        return 1
    except Exception as error:
        print(str(error), file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
