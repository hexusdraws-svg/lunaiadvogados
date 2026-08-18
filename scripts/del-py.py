import os
import stat
import ctypes

filepath = r"C:\Users\the exceed\Documents\lunaiadvocacia\src\routes\processos_.$id.tsx"

try:
    # Try normal remove
    os.remove(filepath)
    print("Removed successfully")
except Exception as e:
    print(f"Normal remove failed: {e}")
    
    # Try to make it writable first
    try:
        os.chmod(filepath, stat.S_IWRITE | stat.S_IREAD)
        os.remove(filepath)
        print("Removed after chmod")
    except Exception as e2:
        print(f"Chmod failed: {e2}")
        
    # Try MoveFileEx with MOVEFILE_DELAY_UNTIL_REBOOT
    try:
        MOVEFILE_DELAY_UNTIL_REBOOT = 0x4
        result = ctypes.windll.kernel32.MoveFileExW(
            ctypes.c_wchar_p(filepath), 
            None, 
            MOVEFILE_DELAY_UNTIL_REBOOT
        )
        if result:
            print("Scheduled for deletion on reboot")
        else:
            print("MoveFileEx failed")
    except Exception as e3:
        print(f"MoveFileEx error: {e3}")