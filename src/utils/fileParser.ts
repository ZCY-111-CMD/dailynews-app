import mammoth from 'mammoth'
import { marked } from 'marked'

// 配置marked选项，保持Typora格式
marked.setOptions({
  breaks: true,        // 支持换行符转换为<br>（Typora风格）
  gfm: true,           // 启用GitHub风格Markdown（支持表格、删除线等）
  headerIds: false,    // 不添加header id
  mangle: false        // 不混淆邮箱地址
})

// 解析Word文档
export async function parseWordFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const result = await mammoth.convertToHtml({ arrayBuffer })
        resolve(result.value)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

// 上传单个图片文件
async function uploadImageFile(imageFile: File, options?: { skipLibrary?: boolean }): Promise<string> {
  const formData = new FormData()
  formData.append('image', imageFile)

  console.log('正在上传图片:', imageFile.name, '大小:', imageFile.size)

  const skipParam = options?.skipLibrary ? '?skipLibrary=true' : ''
  const response = await fetch(`/api/image-library${skipParam}`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('图片上传失败响应:', errorText)
    throw new Error(`图片上传失败: ${imageFile.name}`)
  }

  const data = await response.json()
  console.log('图片上传成功，返回路径:', data.localPath || data.url)
  return data.localPath || data.url
}

// 从文件路径中提取文件名（支持Windows和Unix路径）
function getFileName(path: string): string {
  // 统一处理 / 和 \ 分隔符
  // 先将所有反斜杠替换为正斜杠（处理Windows路径）
  // 注意：正则表达式中的 \\ 匹配一个反斜杠字符
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/')
  const fileName = parts[parts.length - 1]
  console.log(`getFileName: 输入="${path}" -> 规范化="${normalized}" -> 文件名="${fileName}"`)
  return fileName
}

// 从文件路径中提取相对路径（去掉文件夹前缀）
function getRelativePath(path: string): string {
  // 统一处理 / 和 \ 分隔符
  const normalized = path.replace(/\\/g, '/')
  // 移除第一级文件夹名称
  const parts = normalized.split('/')
  if (parts.length > 1) {
    return parts.slice(1).join('/')
  }
  return path
}

// 解析Markdown文件并处理图片（支持文件夹）
export async function parseMarkdownFile(
  file: File,
  imageFiles?: Map<string, File>,
  onProgress?: (message: string) => void,
  options?: { skipLibrary?: boolean }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        let content = e.target?.result as string
        console.log('Markdown原始内容长度:', content.length)
        console.log('Markdown前500字符:', content.substring(0, 500))

        // 如果提供了图片文件，处理图片上传
        if (imageFiles && imageFiles.size > 0) {
          onProgress?.(`检测到 ${imageFiles.size} 个图片文件，开始处理...`)

          // 匹配所有Markdown图片引用: ![alt](path)
          const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
          const matches: Array<{ full: string; alt: string; path: string }> = []

          let match
          while ((match = imageRegex.exec(content)) !== null) {
            matches.push({
              full: match[0],
              alt: match[1],
              path: match[2]
            })
          }

          console.log(`在Markdown中找到 ${matches.length} 个图片引用`)
          matches.forEach((m, i) => {
            console.log(`图片${i + 1}: ${m.path}`)
          })

          // 处理每个图片引用
          let uploadedCount = 0
          for (const imgMatch of matches) {
            const imagePath = imgMatch.path

            // 跳过已经是在线图片的URL
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
              console.log('跳过在线图片:', imagePath)
              continue
            }

            // 提取纯文件名（从任何路径格式中提取）
            // 支持Windows路径 D:\path\file.jpg 和 Unix路径 /path/file.jpg
            const imageName = getFileName(imagePath)
            console.log(`处理图片: ${imagePath} -> 提取文件名: ${imageName}`)

            // 尝试匹配图片文件（支持多种路径格式）
            let matchedFile: File | undefined

            // 尝试多种匹配方式
            for (const [key, imageFile] of imageFiles.entries()) {
              const keyLower = key.toLowerCase()
              const imageNameLower = imageName.toLowerCase()

              console.log(`尝试匹配: key="${key}" imageName="${imageName}"`)

              // 1. 精确匹配文件名
              if (keyLower === imageNameLower) {
                matchedFile = imageFile
                console.log('✓ 精确匹配成功')
                break
              }

              // 2. 匹配相对路径（去掉文件夹前缀）
              const relativeKey = getRelativePath(key).toLowerCase()
              if (relativeKey === imageNameLower || relativeKey.endsWith('/' + imageNameLower)) {
                matchedFile = imageFile
                console.log('✓ 相对路径匹配成功')
                break
              }

              // 3. 匹配带 ./ 的相对路径
              if (relativeKey === `./${imageNameLower}` || relativeKey === `./images/${imageNameLower}`) {
                matchedFile = imageFile
                console.log('✓ ./相对路径匹配成功')
                break
              }

              // 4. 匹配原始路径
              if (keyLower === imageName.toLowerCase() || keyLower.endsWith('/' + imageNameLower)) {
                matchedFile = imageFile
                console.log('✓ 原始路径匹配成功')
                break
              }
            }

            if (matchedFile) {
              try {
                uploadedCount++
                onProgress?.(`上传图片 ${uploadedCount}/${matches.length}: ${imageName}`)

                const uploadedUrl = await uploadImageFile(matchedFile, { skipLibrary: options?.skipLibrary });

                // 替换图片路径为上传后的URL
                content = content.replace(
                  imgMatch.full,
                  `![${imgMatch.alt}](${uploadedUrl})`
                )

                console.log(`✓ 图片上传成功: ${imageName} -> ${uploadedUrl}`)
              } catch (error) {
                console.error(`✗ 图片上传失败: ${imageName}`, error)
                // 继续处理其他图片，不中断
              }
            } else {
              console.warn(`✗ 未找到匹配的图片文件: ${imageName}`)
              console.warn(`  可用的图片keys:`, Array.from(imageFiles.keys()))
            }
          }

          onProgress?.(`完成！共上传 ${uploadedCount}/${matches.length} 张图片`)
        }

        // 转换Markdown为HTML
        console.log('开始转换为HTML...')
        
        // 预处理：统一换行符（处理Windows的CRLF）
        content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

        // 转换Markdown为HTML
        const html = await marked(content)
        console.log('转换后HTML长度:', html.length)
        console.log('HTML前500字符:', html.substring(0, 500))
        
        resolve(html)
      } catch (error) {
        console.error('解析过程出错:', error)
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

// 从文件列表中提取Markdown文件和图片文件（支持文件夹）
export function extractFilesFromFileList(files: FileList | File[]): {
  mdFile: File | null
  imageFiles: Map<string, File>
} {
  let mdFile: File | null = null
  const imageFiles = new Map<string, File>()
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']

  // 将FileList转换为数组
  const fileArray = Array.from(files)

  console.log(`共选择 ${fileArray.length} 个文件`)

  for (const file of fileArray) {
    // webkitRelativePath 包含完整的相对路径（包括文件夹名）
    const relativePath = (file as any).webkitRelativePath || file.name
    const ext = file.name.split('.').pop()?.toLowerCase()

    console.log(`文件: ${relativePath} (类型: ${ext})`)

    // 检查是否是Markdown文件
    if (ext === 'md' || ext === 'markdown') {
      // 如果已经有md文件，检查是否是更可能的文件（例如index.md或readme.md）
      if (!mdFile) {
        mdFile = file
        console.log('✓ 设置为主Markdown文件')
      } else {
        // 优先选择index.md或readme.md
        const fileName = file.name.toLowerCase()
        if (fileName === 'index.md' || fileName === 'readme.md' || fileName === 'readme.markdown') {
          mdFile = file
          console.log('✓ 更换为优先Markdown文件（index/readme）')
        }
      }
    }
    // 检查是否是图片文件
    else if (ext && imageExtensions.includes(ext)) {
      // 使用完整路径作为key，支持文件夹结构
      imageFiles.set(relativePath, file)
      // 也保存纯文件名，增加匹配成功率
      imageFiles.set(file.name, file)
      console.log(`✓ 添加图片文件: ${relativePath}`)
    }
  }

  console.log(`提取结果: Markdown文件=${mdFile?.name}, 图片数量=${imageFiles.size}`)
  return { mdFile, imageFiles }
}

// 判断文件类型
export function getFileType(file: File): 'word' | 'markdown' | 'unknown' {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'docx') return 'word'
  if (extension === 'md' || extension === 'markdown') return 'markdown'

  return 'unknown'
}

// 上传文件到服务器
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/image-library/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('文件上传失败')
  }

  const data = await response.json()
  return data.localPath || data.url
}
