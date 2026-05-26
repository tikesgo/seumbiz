# 롯데모바일 자동등록 프로그램 1차

삼성 플로우로 휴대폰 화면을 PC에 띄워둔 상태에서 PC 마우스/키보드 입력을 자동화하는 1차 테스트 도구입니다.

비공식 API와 ADB 앱 조작은 사용하지 않습니다. 현재 기본 버전은 `pyautogui`로 화면 좌표를 천천히 이동해 확인하고, 핀번호 1개를 입력한 뒤 등록 버튼을 누릅니다.

## 설치

```powershell
cd C:\Users\acro7\Documents\Codex\세움기프트_V3\auto-register
python -m pip install -r requirements.txt
```

## 실제 입력 실행

```powershell
python register.py --pin 2342014243781000
```

실행하면 3초 카운트다운 후 아래 순서로 동작합니다.

1. 입력창 좌표로 천천히 이동
2. 클릭 직전 1초 대기
3. 입력창 클릭
4. `Ctrl + A`
5. 핀번호 입력
6. 등록 버튼 좌표로 천천히 이동
7. 클릭 직전 1초 대기
8. 등록 버튼 클릭

## 테스트 모드

실제 입력과 클릭 없이 마우스가 어디로 이동하는지만 확인할 수 있습니다.

```powershell
python register.py --test
```

테스트 모드 동작:

- 3초 카운트다운
- 입력칸 좌표로 이동
- 클릭하지 않고 멈춤
- 등록 버튼 좌표로 이동
- 클릭하지 않고 종료

## config.json

```json
{
  "pinInputClick": {
    "x": 2270,
    "y": 483
  },
  "registerButtonClick": {
    "x": 2253,
    "y": 564
  },
  "countdownSeconds": 3,
  "delaySeconds": 0.4,
  "typeIntervalSeconds": 0.01,
  "moveDurationSeconds": 1,
  "clearBeforeType": true
}
```

- `pinInputClick`: 삼성 플로우 화면에서 롯데모바일 핀번호 입력칸 좌표
- `registerButtonClick`: 등록 버튼 좌표
- `countdownSeconds`: 실행 전 준비 시간
- `delaySeconds`: 각 동작 사이 기본 대기 시간
- `typeIntervalSeconds`: 핀번호 입력 속도
- `moveDurationSeconds`: 마우스 이동 시간. 디버그 확인을 위해 기본값은 1초입니다.
- `clearBeforeType`: 입력 전 `Ctrl + A` 실행 여부

## 좌표 확인 방법

아래 명령으로 현재 마우스 위치를 계속 확인할 수 있습니다.

```powershell
python -c "import pyautogui, time; print('Ctrl+C로 종료'); [print(pyautogui.position()) or time.sleep(0.5) for _ in iter(int, 1)]"
```

1. 삼성 플로우 창에서 롯데모바일 앱 화면을 띄웁니다.
2. 마우스를 핀번호 입력칸 위에 올립니다.
3. 출력되는 `(x, y)` 값을 `pinInputClick`에 입력합니다.
4. 마우스를 등록 버튼 위에 올립니다.
5. 출력되는 `(x, y)` 값을 `registerButtonClick`에 입력합니다.

## FAILSAFE 사용법

`pyautogui.FAILSAFE = True`가 켜져 있습니다.

자동화 중 멈추고 싶으면 마우스를 화면 왼쪽 위 끝 모서리로 빠르게 이동하세요. 즉시 중단됩니다.

## 보관된 ADB 버전

이전 ADB 기반 1차 파일은 혼동 방지를 위해 아래 폴더에 보관했습니다.

```text
auto-register/adb-archive
```

## 1차 범위

- 핀번호 1개 자동 입력
- 등록 버튼 클릭
- 테스트 모드 좌표 확인
- 성공/실패 판독 없음
- 반복 등록 없음
- 관리자 DB 연동 없음
