# 롯데모바일 자동등록 프로그램 1차

ADB 기반으로 안드로이드 앱 UI에 핀번호 1개를 자동 입력하고 등록 버튼까지 누르는 테스트용 도구입니다.

비공식 API를 사용하지 않습니다. 앱 화면 좌표를 탭하고, 입력창에 핀번호를 입력하는 방식만 사용합니다.

## 준비

1. 안드로이드 휴대폰에서 개발자 옵션과 USB 디버깅을 켭니다.
2. PC에 Android Platform Tools가 설치되어 있어야 합니다.
3. `adb`가 PATH에 잡혀 있으면 `config.json`의 `adbPath`는 `"adb"` 그대로 둡니다.
4. PATH에 없다면 예를 들어 `"C:\\Android\\platform-tools\\adb.exe"`처럼 전체 경로를 넣습니다.

## 실행 위치

```powershell
cd C:\Users\acro7\Documents\Codex\세움기프트_V3\auto-register
```

## ADB 기기 확인

```powershell
npm run devices
```

또는:

```powershell
adb devices -l
```

여러 기기가 연결되어 있으면 출력된 serial 값을 `config.json`의 `deviceSerial`에 넣습니다.

## package/activity 확인 방법

앱을 휴대폰에서 직접 실행한 뒤 아래 명령을 사용합니다.

```powershell
adb shell dumpsys window | findstr mCurrentFocus
```

또는:

```powershell
adb shell dumpsys activity activities | findstr mResumedActivity
```

출력 예시:

```text
com.example.app/.MainActivity
```

이 경우 `config.json`에 아래처럼 입력합니다.

```json
{
  "appPackage": "com.example.app",
  "appActivity": ".MainActivity"
}
```

`appActivity`를 모르면 비워둘 수 있습니다. 이때 스크립트는 `monkey -p` 방식으로 앱 실행을 시도합니다.

## 좌표값 확인 방법

휴대폰에서 포인터 위치 표시를 켜는 방법:

1. 개발자 옵션 열기
2. `포인터 위치` 또는 `Pointer location` 켜기
3. 앱 화면에서 입력창과 등록 버튼을 눌러 x/y 좌표 확인
4. `config.json`에 입력

또는 ADB로 화면 캡처를 저장해서 좌표를 확인할 수 있습니다.

```powershell
adb exec-out screencap -p > screen.png
```

## config.json

```json
{
  "adbPath": "adb",
  "deviceSerial": "",
  "appPackage": "",
  "appActivity": "",
  "pinInputTap": {
    "x": 0,
    "y": 0
  },
  "registerButtonTap": {
    "x": 0,
    "y": 0
  },
  "delayMs": 800
}
```

- `pinInputTap`: 핀번호 입력창 좌표
- `registerButtonTap`: 등록 버튼 좌표
- `delayMs`: 앱 실행, 입력, 버튼 클릭 사이 대기 시간

## 핀번호 1개 등록 테스트

```powershell
node register.js --pin 2342014243781000
```

또는:

```powershell
npm run register -- 2342014243781000
```

## 1차 범위

- 연결 기기 확인
- 앱 실행
- 핀번호 입력창 좌표 탭
- 핀번호 1개 입력
- 등록 버튼 좌표 탭

## 다음 단계로 남긴 것

- 성공/실패 화면 판독
- 여러 핀번호 반복 등록
- 관리자 DB와 자동 연동
- 앱 화면 해상도별 좌표 프로필 관리
