# Docker Setup for 0G Node on macOS

## Issue
The 0G node binaries are compiled for Linux x86-64, but we're running on macOS ARM64. We need Docker to run them in a Linux container.

## Solution: Install Docker Desktop

### Step 1: Download Docker Desktop for Mac
1. Go to https://www.docker.com/products/docker-desktop/
2. Download "Docker Desktop for Mac with Apple Chip"
3. Install the .dmg file

### Step 2: Start Docker Desktop
1. Launch Docker Desktop from Applications
2. Wait for it to start (you'll see the Docker whale icon in the menu bar)

### Step 3: Verify Installation
```bash
docker --version
docker run hello-world
```

## Alternative: Use Linux Server

If you prefer not to use Docker, you can:

1. **Use a cloud Linux server** (AWS EC2, Google Cloud, DigitalOcean, etc.)
2. **Use a local Linux VM** (VMware, VirtualBox, Parallels)
3. **Request macOS binaries** from the 0G team

## Recommended Specs for Linux Server
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **CPU**: 8 cores
- **RAM**: 64 GB
- **Storage**: 1 TB NVMe SSD
- **Network**: 1 Gbps

## Continue Setup After Docker Installation

Once Docker is installed, we can create a Dockerfile to run the 0G node in a Linux container with proper port mapping and volume mounts.
