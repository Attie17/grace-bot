# Test script for /api/v2/message route
# Tests: escalation detection (suicide, violence) + natural 20-turn wrap-up

$baseUrl = "http://localhost:3002"
$sessionId = "test-session-$(Get-Random)"

Write-Host "=== TESTING /api/v2/message ===" -ForegroundColor Cyan
Write-Host "SessionId: $sessionId" -ForegroundColor Gray
Write-Host ""

# Test 1: Suicide escalation
Write-Host "TEST 1: SUICIDE MESSAGE ESCALATION" -ForegroundColor Yellow
$suicideMessage = "I'm thinking about ending my life. I can't go on anymore."
$response = Invoke-RestMethod -Uri "$baseUrl/api/v2/message" -Method Post -Body (
    @{ sessionId = $sessionId; message = $suicideMessage } | ConvertTo-Json
) -ContentType "application/json"

Write-Host "User message: $suicideMessage" -ForegroundColor Gray
Write-Host "Response:"
Write-Host "  reply: $($response.reply)"
Write-Host "  escalationFlag: $($response.escalationFlag)"
Write-Host "  ended: $($response.ended)"
Write-Host ""

# Test 2: Violence/anger escalation (new session so it's isolated)
$sessionId2 = "test-session-violence-$(Get-Random)"
Write-Host "TEST 2: VIOLENCE MESSAGE ESCALATION" -ForegroundColor Yellow
$violenceMessage = "I'm going to hurt my partner. I can't take this anymore."
$response2 = Invoke-RestMethod -Uri "$baseUrl/api/v2/message" -Method Post -Body (
    @{ sessionId = $sessionId2; message = $violenceMessage } | ConvertTo-Json
) -ContentType "application/json"

Write-Host "User message: $violenceMessage" -ForegroundColor Gray
Write-Host "Response:"
Write-Host "  reply: $($response2.reply)"
Write-Host "  escalationFlag: $($response2.escalationFlag)"
Write-Host "  ended: $($response2.ended)"
Write-Host ""

# Test 3: 20-turn natural conversation to trigger wrap-up
$sessionId3 = "test-session-20turn-$(Get-Random)"
Write-Host "TEST 3: 20-TURN CONVERSATION (NATURAL WRAP-UP)" -ForegroundColor Yellow
Write-Host "SessionId: $sessionId3" -ForegroundColor Gray

$normalMessages = @(
    "Hi, I'm struggling with alcohol.",
    "Yeah, it's been going on for about two years now.",
    "I started drinking to cope with stress at work.",
    "My friends have mentioned it, but I haven't done anything about it yet.",
    "I'm not on any medications right now.",
    "I have medical aid through my employer.",
    "I think I'm ready to get help.",
    "I'm available to start pretty soon, maybe next week.",
    "Mornings work best for me.",
    "My name is James.",
    "My number is 0821234567.",
    "I live in Johannesburg.",
    "I've tried quitting on my own a few times but it didn't work.",
    "I think drinking has affected my work performance.",
    "My family doesn't really know the extent of it.",
    "I'm worried about losing my job if this continues.",
    "I've been drinking most evenings after work.",
    "I want to get sober and rebuild my life.",
    "I'm scared but I know I need help.",
    "When can someone call me to discuss next steps?"
)

for ($i = 0; $i -lt $normalMessages.Count; $i++) {
    $msg = $normalMessages[$i]
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v2/message" -Method Post -Body (
        @{ sessionId = $sessionId3; message = $msg } | ConvertTo-Json
    ) -ContentType "application/json"
    
    $turnNum = $i + 1
    Write-Host "Turn $turnNum - User: $msg" -ForegroundColor Gray
    Write-Host "         Grace: $($response.reply)" -ForegroundColor Cyan
    Write-Host "         ended=$($response.ended), escalationFlag=$($response.escalationFlag)" -ForegroundColor DarkGray
    
    if ($response.ended) {
        Write-Host "         >>> CONVERSATION ENDED (wrap-up triggered)" -ForegroundColor Green
        break
    }
    Write-Host ""
}

Write-Host ""
Write-Host "=== TESTS COMPLETE ===" -ForegroundColor Cyan
