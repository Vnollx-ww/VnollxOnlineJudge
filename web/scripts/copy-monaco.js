const fs = require('fs-extra');
const path = require('path');

async function copyMonacoToPublic() {
  const monacoSrc = path.join(__dirname, '..', 'node_modules', 'monaco-editor', 'min', 'vs');
  const publicDest = path.join(__dirname, '..', 'public', 'monaco', 'vs');

  try {
    // 确保目标目录存在
    await fs.ensureDir(publicDest);
    
    // 复制 Monaco Editor 文件
    await fs.copy(monacoSrc, publicDest);
    
    console.log('✅ Monaco Editor 已复制到 public/monaco/vs/');
    console.log('📦 文件大小约:', await getFolderSize(publicDest));
  } catch (error) {
    console.error('❌ 复制失败:', error.message);
  }
}

async function getFolderSize(folder) {
  let size = 0;
  const files = await fs.readdir(folder, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = path.join(folder, file.name);
    if (file.isDirectory()) {
      size += await getFolderSize(filePath);
    } else {
      const stats = await fs.stat(filePath);
      size += stats.size;
    }
  }
  
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

copyMonacoToPublic();
