import http.server
import socket
import socketserver
import webbrowser
import os
import sys
import threading
import time

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
os.chdir(DIRECTORY)

class HighPerformanceHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        # Allow cross-origin for local testing
        self.send_header('Access-Control-Allow-Origin', '*')
        
        # Smart caching: HTML and JS always fresh, media and assets cached
        path = self.path.split('?')[0].lower()
        if path.endswith(('.html', '.js', '/')) or '.' not in path:
            self.send_header('Cache-Control', 'no-cache, must-revalidate')
        else:
            self.send_header('Cache-Control', 'public, max-age=3600')
            
        super().end_headers()

    def handle(self):
        try:
            super().handle()
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError, TimeoutError):
            pass

    def log_message(self, format, *args):
        # Quieter console: only show requests if not media
        msg = format % args
        if not any(ext in msg for ext in ['.png', '.jpg', '.ico', '.css']):
            sys.stdout.write(f"[{time.strftime('%H:%M:%S')}] {msg}\n")
            sys.stdout.flush()

class DualStackThreadingServer(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, server_address, RequestHandlerClass):
        # Try dual-stack IPv6 (handles both IPv4 and IPv6 on Windows)
        try:
            self.address_family = socket.AF_INET6
            super().__init__(server_address, RequestHandlerClass)
        except OSError:
            # Fallback to standard IPv4
            self.address_family = socket.AF_INET
            ipv4_addr = ('0.0.0.0', server_address[1])
            super().__init__(ipv4_addr, RequestHandlerClass)

    def server_bind(self):
        if self.address_family == socket.AF_INET6:
            try:
                # Enable dual-stack: accepts both IPv4 (127.0.0.1) and IPv6 (::1 / localhost)
                self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
            except (AttributeError, OSError):
                pass
        super().server_bind()

def open_browser():
    time.sleep(0.6)
    url = f"http://127.0.0.1:{PORT}"
    print(f"Abriendo navegador en {url} ...")
    webbrowser.open(url)

def kill_stale_server_on_port(port):
    """Cleanly close any orphaned Python server holding the port on Windows."""
    try:
        import subprocess
        # Find PID using port
        cmd = f"powershell -Command \"(Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique\""
        out = subprocess.check_output(cmd, shell=True, text=True).strip()
        if out:
            pids = [int(p) for p in out.split() if p.isdigit()]
            my_pid = os.getpid()
            for pid in pids:
                if pid != my_pid:
                    try:
                        # Check if process is python
                        check_cmd = f"powershell -Command \"(Get-Process -Id {pid} -ErrorAction SilentlyContinue).ProcessName\""
                        proc_name = subprocess.check_output(check_cmd, shell=True, text=True).strip().lower()
                        if 'python' in proc_name:
                            print(f"Liberando puerto {port} (cerrando proceso previo PID {pid})...")
                            subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
                            time.sleep(0.5)
                    except Exception:
                        pass
    except Exception:
        pass

if __name__ == "__main__":
    kill_stale_server_on_port(PORT)
    
    server = None
    active_port = PORT
    for port in [PORT, 8081, 8082]:
        try:
            server = DualStackThreadingServer(('::', port), HighPerformanceHandler)
            active_port = port
            break
        except OSError:
            try:
                server = DualStackThreadingServer(('0.0.0.0', port), HighPerformanceHandler)
                active_port = port
                break
            except OSError:
                continue

    if not server:
        print(f"ERROR: No se pudo enlazar ningún puerto entre {PORT} y 8082.")
        sys.exit(1)

    PORT = active_port
    print("=" * 65)
    print(f" Servidor MythicProgression.com (Multi-hilo de Alta Velocidad)")
    print(f" URL Principal: http://127.0.0.1:{PORT}")
    print(f" URL Localhost: http://localhost:{PORT}")
    print(f" Soporta IPv4 y IPv6 (Opera GX, Chrome, Edge)")
    print(" (Presiona Ctrl+C en esta ventana para detener el servidor)")
    print("=" * 65)

    threading.Thread(target=open_browser, daemon=True).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        server.server_close()
