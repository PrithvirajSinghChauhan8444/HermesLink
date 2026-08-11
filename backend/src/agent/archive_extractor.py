import os
import zipfile
import tarfile
import shutil
from typing import List

def extract_archive(file_path: str, output_path: str) -> List[str]:
    """
    Attempts to extract the archive file.
    Returns a list of extracted files or raises an exception.
    """
    ARCHIVE_EXTENSIONS = (".zip", ".tar", ".tar.gz", ".tgz", ".tar.bz2", ".tar.xz", ".gz", ".rar")
    
    archive_files: List[str] = []
    if file_path and os.path.isfile(file_path):
        if any(file_path.lower().endswith(ext) for ext in ARCHIVE_EXTENSIONS):
            archive_files.append(file_path)
    
    if not archive_files:
        # Scan folder recursively as fallback
        if output_path and os.path.isdir(output_path):
            for root, dirs, files in os.walk(output_path):
                for file_name in files:
                    if any(file_name.lower().endswith(ext) for ext in ARCHIVE_EXTENSIONS):
                        archive_files.append(os.path.join(root, file_name))

    for archive in archive_files:
        filename = os.path.basename(archive)
        print(f"[Extract] Extracting: {filename}")
        
        archive_parent = os.path.dirname(archive)
        base_name = filename
        for ext in (".tar.gz", ".tar.bz2", ".tar.xz", ".tgz", ".tar", ".zip", ".gz", ".rar"):
            if base_name.lower().endswith(ext):
                base_name = base_name[:len(base_name) - len(ext)]
                break
        
        extract_dir = os.path.join(archive_parent, base_name)
        os.makedirs(extract_dir, exist_ok=True)
        
        if zipfile.is_zipfile(archive):
            with zipfile.ZipFile(archive, 'r') as zf:
                zf.extractall(extract_dir)
        elif tarfile.is_tarfile(archive):
            with tarfile.open(archive, 'r:*') as tf:
                tf.extractall(extract_dir)
        else:
            try:
                shutil.unpack_archive(archive, extract_dir)
            except Exception as e:
                raise ValueError(f"Unsupported or corrupted archive format: {filename}. Error: {e}")
                
        print(f"[Extract] Successfully extracted: {filename} → {extract_dir}")
        
    return archive_files
