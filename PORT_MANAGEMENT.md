# 포트 관리 가이드

## 포트 사용 중인 프로세스 확인 및 종료

### 포트 사용 확인

```powershell
# 특정 포트 확인
netstat -ano | findstr ":3000"

# 여러 포트 확인
netstat -ano | findstr ":3000 :3001"
```

### 프로세스 종료

```powershell
# 프로세스 ID로 종료
Stop-Process -Id [PID] -Force

# 예시
Stop-Process -Id 30044 -Force
```

### 모든 Node.js 프로세스 종료

```powershell
# 모든 Node.js 프로세스 찾기
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force

# 또는
taskkill /F /IM node.exe
```

## 자주 사용하는 포트

- **3000**: Next.js 기본 포트
- **3001**: Next.js 대체 포트 (3000이 사용 중일 때)
- **8080**: 다른 개발 서버
- **5000**: 다른 개발 서버

## 포트 해제 스크립트

프로젝트 루트에 `free-ports.ps1` 파일을 만들어 사용할 수 있습니다:

```powershell
# free-ports.ps1
Write-Host "포트 3000과 3001을 사용하는 프로세스 확인 중..."

$ports = @(3000, 3001)
foreach ($port in $ports) {
    $connections = netstat -ano | findstr ":$port"
    if ($connections) {
        Write-Host "포트 $port 사용 중인 프로세스:"
        $connections | ForEach-Object {
            $parts = $_ -split '\s+'
            $pid = $parts[-1]
            if ($pid -match '^\d+$') {
                Write-Host "  PID: $pid"
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "  프로세스 종료됨"
            }
        }
    } else {
        Write-Host "포트 $port 사용 중이지 않음"
    }
}

Write-Host "완료!"
```

사용 방법:
```powershell
.\free-ports.ps1
```

