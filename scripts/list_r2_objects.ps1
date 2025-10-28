# Script to list all objects in R2 bucket
$token = "yOUPX80kVJ3kG4ZmULsQoEjIJwJcDX7aSF70elVm"
$account = "6045b0c922c5f02ca8efe49010a2e687"
$bucket = "nextjs-incremental-cache"
$baseUrl = "https://api.cloudflare.com/client/v4/accounts/$account/r2/buckets/$bucket/objects"

$allObjects = @()
$cursor = $null
$pageCount = 0

Write-Host "Fetching all objects from R2 bucket: $bucket" -ForegroundColor Yellow

do {
    $pageCount++
    $url = $baseUrl + "?limit=1000"
    if ($cursor) {
        $url += "&cursor=$cursor"
    }

    Write-Host "Fetching page $pageCount..." -ForegroundColor Cyan

    $response = Invoke-RestMethod -Uri $url -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    if ($response.success) {
        $allObjects += $response.result
        $cursor = $response.result_info.cursor
        $isTruncated = $response.result_info.is_truncated
        Write-Host "  Found $($response.result.Count) objects" -ForegroundColor Green
    } else {
        Write-Host "Error fetching data: $($response.errors)" -ForegroundColor Red
        break
    }
} while ($isTruncated)

Write-Host "`nTotal objects found: $($allObjects.Count)" -ForegroundColor Yellow

# Search for specific pages
$page1618 = $allObjects | Where-Object { $_.key -like "*1618*" }
$page1900 = $allObjects | Where-Object { $_.key -like "*1900*" }

Write-Host "`n=== Page 1618 ===" -ForegroundColor Magenta
if ($page1618) {
    $page1618 | ForEach-Object {
        Write-Host "  Key: $($_.key)"
        Write-Host "  Size: $($_.size) bytes"
        Write-Host "  Modified: $($_.last_modified)"
        Write-Host ""
    }
} else {
    Write-Host "  NOT FOUND in R2" -ForegroundColor Red
}

Write-Host "`n=== Page 1900 ===" -ForegroundColor Magenta
if ($page1900) {
    $page1900 | ForEach-Object {
        Write-Host "  Key: $($_.key)"
        Write-Host "  Size: $($_.size) bytes"
        Write-Host "  Modified: $($_.last_modified)"
        Write-Host ""
    }
} else {
    Write-Host "  NOT FOUND in R2" -ForegroundColor Red
}

# Group objects by prefix (build ID)
Write-Host "`n=== Objects grouped by Build ID ===" -ForegroundColor Yellow
$grouped = $allObjects | Group-Object { $_.key.Split('/')[0] }
$grouped | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count) objects"
}

# Export full list to JSON
$outputFile = "r2_objects_full_list.json"
$allObjects | ConvertTo-Json -Depth 10 | Out-File $outputFile -Encoding UTF8
Write-Host "`nFull list exported to: $outputFile" -ForegroundColor Green