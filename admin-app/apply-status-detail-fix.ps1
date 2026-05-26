$ErrorActionPreference = "Stop"

$statusPath = "C:\Users\acro7\Desktop\세움기프트_V2\status.js"
$cssPath = "C:\Users\acro7\Desktop\세움기프트_V2\styles.css"

$status = Get-Content -LiteralPath $statusPath -Raw
$pattern = '(?s)        <article class="status-item">\s*<div class="status-item-main">\s*<span class="status-time">\$\{item\.time\}</span>\s*<strong>\$\{item\.giftType\}</strong>\s*</div>\s*<div class="status-item-meta">\s*<span class="status-amount">\$\{formatWon\(item\.amount\)\}</span>\s*<span class="status-badge status-\$\{item\.status\}">\$\{item\.status\}</span>\s*</div>\s*</article>'
$new = @'
        <article class="status-item">
          <span class="status-time">${item.time}</span>
          <strong class="status-product">${item.giftType}</strong>
          <span class="status-amount">${formatWon(item.amount)}</span>
          <span class="status-badge status-${item.status}">${item.status}</span>
        </article>
'@

$updatedStatus = [regex]::Replace($status, $pattern, $new, 1)
if ($updatedStatus -eq $status -and -not $status.Contains('class="status-product"')) {
  throw "status.js render block not found."
}

if ($updatedStatus -ne $status) {
  Set-Content -LiteralPath $statusPath -Value $updatedStatus -Encoding UTF8
  Write-Host "status.js updated"
} else {
  Write-Host "status.js already updated"
}

$css = Get-Content -LiteralPath $cssPath -Raw
if (-not $css.Contains(".status-page .status-product {")) {
  $addition = @'

/* Status detail page grid alignment */
.status-page .status-item {
  display: grid !important;
  grid-template-columns: 140px minmax(0, 1fr) 160px 100px !important;
  align-items: center !important;
  gap: 16px !important;
}

.status-page .status-time {
  grid-column: 1 !important;
  min-width: 0 !important;
}

.status-page .status-product {
  grid-column: 2 !important;
  min-width: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.status-page .status-amount {
  grid-column: 3 !important;
  width: 160px !important;
  justify-self: end !important;
  text-align: right !important;
  white-space: nowrap !important;
}

.status-page .status-badge {
  grid-column: 4 !important;
  width: 100px !important;
  min-width: 100px !important;
  justify-self: end !important;
  box-sizing: border-box !important;
}

@media (max-width: 560px) {
  .status-page .status-item {
    grid-template-columns: minmax(0, 1fr) auto !important;
    gap: 6px 12px !important;
  }

  .status-page .status-time {
    grid-column: 1 !important;
    grid-row: 1 !important;
  }

  .status-page .status-badge {
    grid-column: 2 !important;
    grid-row: 1 !important;
  }

  .status-page .status-product {
    grid-column: 1 !important;
    grid-row: 2 !important;
  }

  .status-page .status-amount {
    grid-column: 2 !important;
    grid-row: 2 !important;
    width: auto !important;
  }
}
'@
  Add-Content -LiteralPath $cssPath -Value $addition -Encoding UTF8
  Write-Host "styles.css updated"
} else {
  Write-Host "styles.css status grid CSS already present"
}
