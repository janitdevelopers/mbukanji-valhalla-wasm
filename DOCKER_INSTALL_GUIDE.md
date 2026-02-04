# Docker Installation Guide for Windows

## Quick Install (Recommended)

### Option 1: Docker Desktop (Easiest)

1. **Download Docker Desktop**:
   - Visit: https://www.docker.com/products/docker-desktop/
   - Download "Docker Desktop for Windows"
   - File: `Docker Desktop Installer.exe`

2. **Install**:
   - Run the installer
   - Follow the installation wizard
   - Restart your computer when prompted

3. **Start Docker Desktop**:
   - Launch Docker Desktop from Start menu
   - Wait for it to start (whale icon in system tray)
   - Verify: Open PowerShell and run:
     ```powershell
     docker --version
     docker ps
     ```

### Option 2: Using Winget (Windows Package Manager)

```powershell
# Open PowerShell as Administrator
winget install Docker.DockerDesktop
```

### Option 3: Using Chocolatey

```powershell
# If you have Chocolatey installed
choco install docker-desktop
```

---

## System Requirements

- **Windows 10/11** (64-bit)
- **WSL 2** (Windows Subsystem for Linux 2)
  - Docker Desktop will install this automatically
- **Virtualization enabled** in BIOS
- **4GB RAM minimum** (16GB recommended for WASM build)
- **20GB free disk space**

---

## Verify Installation

After installation, verify Docker works:

```powershell
# Check Docker version
docker --version

# Check Docker is running
docker ps

# Test with hello-world
docker run hello-world
```

---

## Troubleshooting

### "Docker daemon is not running"

**Solution**: Start Docker Desktop application

### "WSL 2 installation is incomplete"

**Solution**: 
1. Open PowerShell as Administrator
2. Run: `wsl --install`
3. Restart computer
4. Start Docker Desktop

### "Virtualization not enabled"

**Solution**:
1. Restart computer
2. Enter BIOS/UEFI settings
3. Enable "Virtualization" or "VT-x" or "AMD-V"
4. Save and exit

### "Docker Desktop won't start"

**Solution**:
1. Check Windows updates
2. Ensure WSL 2 is installed: `wsl --status`
3. Restart computer
4. Try running Docker Desktop as Administrator

---

## After Installation

Once Docker is installed and running:

1. **Verify it works**:
   ```powershell
   docker --version
   docker ps
   ```

2. **Build WASM**:
   ```powershell
   cd C:\Users\sonan\Projects\mbukanji-valhalla-wasm
   npm run build:wasm
   ```

---

## Quick Reference

**Install**: Download Docker Desktop from docker.com  
**Verify**: `docker --version`  
**Start**: Launch Docker Desktop application  
**Build WASM**: `npm run build:wasm`
