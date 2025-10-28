# Fast R2 listing script using Cloudflare API
param(
    [string]$prefix = "",
    [string]$search = "",
    [switch]$stats,
    [switch]$export
)

$token = "yOUPX80kVJ3kG4ZmULsQoEjIJwJcDX7aSF70elVm"
$account = "6045b0c922c5f02ca8efe49010a2e687"
$bucket = "nextjs-incremental-cache"
$baseUrl = "https://api.cloudflare.com/client/v4/accounts/$account/r2/buckets/$bucket/objects"

function Get-R2Objects {
    param($prefix)

    $allObjects = @()
    $cursor = $null

    do {
        $url = "$baseUrl?limit=1000"
        if ($prefix) { $url += "&prefix=$prefix" }
        if ($cursor) { $url += "&cursor=$cursor" }

        try {
            $response = Invoke-RestMethod -Uri $url -Headers @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            }
        } catch {
            Write-Host "Error fetching data: $_" -ForegroundColor Red
            break
        }

        if ($response.success) {
            $allObjects += $response.result
            $cursor = $response.result_info.cursor
            $isTruncated = $response.result_info.is_truncated
        } else {
            Write-Host "Error: $($response.errors)" -ForegroundColor Red
            break
        }
    } while ($isTruncated)

    return $allObjects
}

Write-Host "=== R2 Bucket: $bucket ===" -ForegroundColor Cyan

$objects = Get-R2Objects -prefix $prefix

if ($search) {
    $objects = $objects | Where-Object { $_.key -like "*$search*" }
    Write-Host "Found $($objects.Count) objects matching '$search'" -ForegroundColor Yellow
} else {
    Write-Host "Total objects: $($objects.Count)" -ForegroundColor Yellow
}

if ($stats) {
    $totalSize = ($objects | Measure-Object -Property size -Sum).Sum
    $byPrefix = $objects | Group-Object { $_.key.Split('/')[0] } | Sort-Object Count -Descending

    Write-Host "`n=== Statistics ===" -ForegroundColor Magenta
    Write-Host "Total size: $([math]::Round($totalSize/1MB, 2)) MB"
    Write-Host "`nObjects by prefix:"
    $byPrefix | ForEach-Object {
        $prefixSize = ($_.Group | Measure-Object -Property size -Sum).Sum
        Write-Host "  $($_.Name): $($_.Count) objects ($([math]::Round($prefixSize/1KB, 2)) KB)"
    }
}

if ($export) {
    $filename = "r2_export_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
    $objects | ConvertTo-Json -Depth 10 | Out-File $filename -Encoding UTF8
    Write-Host "`nExported to: $filename" -ForegroundColor Green
}

# Display sample objects
if (-not $stats -and -not $export) {
    Write-Host "`n=== Sample Objects ===" -ForegroundColor Magenta
    $objects | Select-Object -First 10 | ForEach-Object {
        Write-Host "$($_.key) ($([math]::Round($_.size/1KB, 2)) KB)"
    }
}