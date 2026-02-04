# Building WASM in Ubuntu VM

**Setup**: Ubuntu VM with shared folder to Windows project

---

## Step 1: Share Project Folder with VM

### Option A: VirtualBox

1. **In VirtualBox** (while VM is powered off):
   - Select your Ubuntu VM
   - Click "Settings" → "Shared Folders"
   - Click the folder icon with "+" (Add Shared Folder)
   - **Folder Path**: `C:\Users\sonan\Projects\mbukanji-valhalla-wasm`
   - **Folder Name**: `mbukanji-valhalla-wasm` (or any name)
   - Check "Auto-mount" and "Make Permanent"
   - Click "OK"

2. **Start Ubuntu VM**

3. **Install Guest Additions** (if not already installed):
   ```bash
   # In Ubuntu VM
   sudo apt update
   sudo apt install -y build-essential dkms linux-headers-$(uname -r)
   
   # Insert Guest Additions CD (Devices → Insert Guest Additions CD Image)
   # Then:
   sudo mount /dev/cdrom /mnt
   cd /mnt
   sudo ./VBoxLinuxAdditions.run
   sudo reboot
   ```

4. **Access shared folder**:
   ```bash
   # Shared folder is usually at:
   ls /media/sf_mbukanji-valhalla-wasm
   
   # Or add yourself to vboxsf group:
   sudo usermod -aG vboxsf $USER
   # Log out and back in, then:
   ls /media/sf_mbukanji-valhalla-wasm
   ```

### Option B: VMware Workstation/Player

1. **In VMware** (while VM is running):
   - VM → Settings → Options → Shared Folders
   - Click "Always enabled"
   - Click "Add" → Browse to: `C:\Users\sonan\Projects\mbukanji-valhalla-wasm`
   - Name it: `mbukanji-valhalla-wasm`
   - Check "Enable this share"
   - Click "OK"

2. **Access shared folder**:
   ```bash
   # Usually at:
   ls /mnt/hgfs/mbukanji-valhalla-wasm
   
   # If not visible, install VMware Tools:
   sudo apt update
   sudo apt install -y open-vm-tools
   sudo reboot
   ```

### Option C: Hyper-V

1. **Enable Enhanced Session Mode**:
   - In Hyper-V Manager: View → Enhanced Session Mode Policy
   - Enable for current user

2. **Connect to VM**:
   - Right-click VM → Connect
   - In connection window, click "Show Options"
   - Go to "Local Resources" tab
   - Click "More..." under "Local devices and resources"
   - Check "Drives" → Select your C: drive
   - Click "OK" → "Connect"

3. **Access in Ubuntu**:
   ```bash
   # Files accessible via /mnt/c/
   ls /mnt/c/Users/sonan/Projects/mbukanji-valhalla-wasm
   ```

---

## Step 2: Install Docker in Ubuntu VM

```bash
# Update package index
sudo apt update

# Install prerequisites
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker

# Verify installation
docker --version
docker ps
```

---

## Step 3: Navigate to Project in VM

```bash
# For VirtualBox:
cd /media/sf_mbukanji-valhalla-wasm

# For VMware:
cd /mnt/hgfs/mbukanji-valhalla-wasm

# For Hyper-V:
cd /mnt/c/Users/sonan/Projects/mbukanji-valhalla-wasm

# Verify you can see the project
ls -la
ls native/
```

---

## Step 4: Build WASM in VM

```bash
# Navigate to native directory
cd native

# Make build script executable
chmod +x build-wasm.sh

# Run the build (takes 30-60 minutes)
./build-wasm.sh

# Or with options:
./build-wasm.sh --clean          # Clean build
./build-wasm.sh --version 3.4.0   # Specific version
```

**Expected output**:
- Builds Docker image
- Compiles Valhalla to WASM
- Outputs to `../wasm/valhalla.wasm` and `../wasm/valhalla.js`

---

## Step 5: Verify Build Output

```bash
# Check WASM files were created
ls -lh ../wasm/

# Should see:
# - valhalla.wasm (~8-15MB)
# - valhalla.js (~50-200KB)
# - metadata.json
```

---

## Step 6: Access Files from Windows

The WASM files should be immediately accessible from Windows since the folder is shared:

```powershell
# In Windows PowerShell
cd C:\Users\sonan\Projects\mbukanji-valhalla-wasm
ls wasm/

# Should see:
# - valhalla.wasm
# - valhalla.js
# - metadata.json
```

---

## Troubleshooting

### "Permission denied" accessing shared folder

**Solution**:
```bash
# For VirtualBox, add user to vboxsf group:
sudo usermod -aG vboxsf $USER
# Log out and back in

# For VMware, install tools:
sudo apt install -y open-vm-tools
sudo reboot
```

### "Docker daemon not running"

**Solution**:
```bash
# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker  # Auto-start on boot

# Check status
sudo systemctl status docker
```

### "Cannot find build-wasm.sh"

**Solution**:
```bash
# Make sure you're in the right directory
pwd
# Should be: /path/to/mbukanji-valhalla-wasm/native

# Check file exists
ls -la build-wasm.sh

# Make executable
chmod +x build-wasm.sh
```

### "Docker build fails"

**Solution**:
```bash
# Check Docker is running
docker ps

# Try clean build
./build-wasm.sh --clean

# Check disk space (needs ~20GB)
df -h
```

### Files not visible in Windows

**Solution**:
- Ensure shared folder is properly mounted
- Check file permissions in VM
- Try refreshing Windows Explorer
- Restart VM if needed

---

## Quick Reference

### VirtualBox Setup:
1. VM Settings → Shared Folders → Add: `C:\Users\sonan\Projects\mbukanji-valhalla-wasm`
2. Install Guest Additions
3. Access: `/media/sf_mbukanji-valhalla-wasm`

### VMware Setup:
1. VM → Settings → Shared Folders → Add folder
2. Install open-vm-tools
3. Access: `/mnt/hgfs/mbukanji-valhalla-wasm`

### Build Commands:
```bash
cd /path/to/project/native
chmod +x build-wasm.sh
./build-wasm.sh
```

---

## Next Steps After Build

Once WASM files are built:

1. **Verify in Windows**:
   ```powershell
   cd C:\Users\sonan\Projects\mbukanji-valhalla-wasm
   ls wasm/
   ```

2. **Build package**:
   ```powershell
   npm run build
   ```

3. **Verify WASM files**:
   ```powershell
   node scripts/verify-wasm.js
   ```

4. **Test or publish** as needed

---

## Summary

1. ✅ Share project folder with VM (VirtualBox/VMware/Hyper-V)
2. ✅ Install Docker in Ubuntu VM
3. ✅ Navigate to project in VM
4. ✅ Run `./build-wasm.sh` in `native/` directory
5. ✅ Wait 30-60 minutes for build
6. ✅ Verify files in Windows

Let me know which VM software you're using, and I can provide more specific instructions!
