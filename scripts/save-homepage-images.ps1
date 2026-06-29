Add-Type -AssemblyName System.Drawing

$dest = Join-Path $PSScriptRoot "..\public\images"
if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Force -Path $dest | Out-Null }

function Save-CoverCropJpg {
    param([string]$Url, [string]$OutPath, [int]$W, [int]$H, [int]$Q = 92)

    $wc    = New-Object System.Net.WebClient
    $bytes = $wc.DownloadData($Url)
    $ms    = New-Object System.IO.MemoryStream(,$bytes)
    $src   = [System.Drawing.Image]::FromStream($ms)

    $scale = [Math]::Max($W / $src.Width, $H / $src.Height)
    $srcW  = [int]($W / $scale)
    $srcH  = [int]($H / $scale)
    $srcX  = [int](($src.Width  - $srcW) / 2)
    $srcY  = [int](($src.Height - $srcH) / 2)

    $bmp = New-Object System.Drawing.Bitmap($W, $H)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $srcRect  = New-Object System.Drawing.RectangleF($srcX, $srcY, $srcW, $srcH)
    $destRect = New-Object System.Drawing.RectangleF(0, 0, $W, $H)
    $g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $src.Dispose()
    $ms.Dispose()

    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
             Where-Object { $_.MimeType -eq 'image/jpeg' }
    $ep    = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
                       [System.Drawing.Imaging.Encoder]::Quality, [long]$Q)
    $bmp.Save($OutPath, $codec, $ep)
    $bmp.Dispose()

    $kb = [math]::Round((Get-Item $OutPath).Length / 1KB)
    Write-Host "  $([System.IO.Path]::GetFileName($OutPath))  ${W}x${H}  $kb KB"
}

$images = @(
    # Recipe card images (800x600)
    [pscustomobject]@{ name="recipe-pizza.jpg";    w=800;  h=600;  url="https://d8j0ntlcm91z4.cloudfront.net/user_3Dsf5Tz58SJP9vxWlpVmEbKYgm2/hf_20260629_152754_6f78178f-8afd-4634-ab49-71f3e4a2a05b.png" },
    [pscustomobject]@{ name="recipe-alfredo.jpg";  w=800;  h=600;  url="https://d8j0ntlcm91z4.cloudfront.net/user_3Dsf5Tz58SJP9vxWlpVmEbKYgm2/hf_20260629_153304_2cc2b50f-0362-423e-93bd-445a26b68052.png" },
    [pscustomobject]@{ name="recipe-cookies.jpg";  w=800;  h=600;  url="https://d8j0ntlcm91z4.cloudfront.net/user_3Dsf5Tz58SJP9vxWlpVmEbKYgm2/hf_20260629_152803_fe8fb496-ddab-42e1-983f-1f0e9fa7dcbe.png" },
    [pscustomobject]@{ name="recipe-burger.jpg";   w=800;  h=600;  url="https://d8j0ntlcm91z4.cloudfront.net/user_3Dsf5Tz58SJP9vxWlpVmEbKYgm2/hf_20260629_152808_e9192d85-b199-4532-aa29-991d9f3f789b.png" },
    # Editorial / section images
    [pscustomobject]@{ name="story-kitchen.jpg";   w=1400; h=900;  url="https://d8j0ntlcm91z4.cloudfront.net/user_3Dsf5Tz58SJP9vxWlpVmEbKYgm2/hf_20260629_152823_3036fd1d-4085-42bc-b6de-d27e15315257.png" },
    [pscustomobject]@{ name="cta-food.jpg";        w=1200; h=800;  url="https://d8j0ntlcm91z4.cloudfront.net/user_3Dsf5Tz58SJP9vxWlpVmEbKYgm2/hf_20260629_152834_80994c1d-308e-4fe2-8505-9ebfbd62b918.png" },
    # Section backgrounds (1920x1080)
    [pscustomobject]@{ name="bg-herbs-top.jpg";    w=1920; h=1080; url="https://d8j0ntlcm91z4.cloudfront.net/user_3Dsf5Tz58SJP9vxWlpVmEbKYgm2/hf_20260629_161057_a7e29950-0b98-4fac-a2d1-28dbb190e710.png" },
    [pscustomobject]@{ name="bg-cuttingboard.jpg"; w=1920; h=1080; url="https://d8j0ntlcm91z4.cloudfront.net/user_3Dsf5Tz58SJP9vxWlpVmEbKYgm2/hf_20260629_161101_20ed9ffd-46d9-499f-bf54-275678627972.png" },
    [pscustomobject]@{ name="bg-kitchen.jpg";      w=1920; h=1080; url="https://d8j0ntlcm91z4.cloudfront.net/user_3Dsf5Tz58SJP9vxWlpVmEbKYgm2/hf_20260629_161106_665e5d62-0bb1-497b-9a9e-ab6e55900c69.png" },
    [pscustomobject]@{ name="bg-community.jpg";    w=1920; h=1080; url="https://d8j0ntlcm91z4.cloudfront.net/user_3Dsf5Tz58SJP9vxWlpVmEbKYgm2/hf_20260629_161111_4eb8776c-96c3-438a-b96c-4d9393ce84d9.png" }
    # hero-shrimp.jpg — DO NOT replace, already in place
    # bg-cta.jpg and bg-footer.jpg — already in place, not in this batch
)

Write-Host "Saving to: $dest"
foreach ($img in $images) {
    $outPath = Join-Path $dest $img.name
    Save-CoverCropJpg -Url $img.url -OutPath $outPath -W $img.w -H $img.h
}
Write-Host "Done."
