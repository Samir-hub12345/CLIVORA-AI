import os
import re

directories = ['frontend/src', 'backend', '.']
exclude_dirs = ['.git', 'node_modules', 'venv', '.next']
allowed_exts = ['.ts', '.tsx', '.py', '.md', '.json']

for d in directories:
    for root, dirs, files in os.walk(d):
        dirs[:] = [dir for dir in dirs if dir not in exclude_dirs]
        for f in files:
            if not any(f.endswith(ext) for ext in allowed_exts):
                continue
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # Replace "Clinova AI" with "CLINOVA AI"
            new_content = content.replace('Clinova AI', 'CLINOVA AI')
            new_content = new_content.replace('clinova AI', 'CLINOVA AI')
            new_content = new_content.replace('CLINOVA ai', 'CLINOVA AI')

            if new_content != content:
                print(f'Updating {path}')
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
