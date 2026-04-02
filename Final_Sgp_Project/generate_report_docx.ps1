$ErrorActionPreference = 'Stop'

$outDocx = "C:\Users\Dell\OneDrive\Desktop\Final_Sgp_Project\Final_Sgp_Project\VIDEO_AI_PROJECT_REPORT_FINAL.docx"
$tmpRoot = Join-Path $env:TEMP ("video_ai_docx_" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tmpRoot | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tmpRoot "_rels") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tmpRoot "word") | Out-Null

function Escape-Xml([string]$s) {
    if ($null -eq $s) { return "" }
    return [System.Security.SecurityElement]::Escape($s)
}

$paras = New-Object System.Collections.Generic.List[string]
function Add-Para([string]$text, [bool]$bold=$false, [bool]$center=$false, [int]$size=24, [bool]$pageBreak=$false) {
    $t = Escape-Xml $text
    $jc = if ($center) { '<w:jc w:val="center"/>' } else { '' }
    $b = if ($bold) { '<w:b/>' } else { '' }
    $pb = if ($pageBreak) { '<w:br w:type="page"/>' } else { '' }
  $p = '<w:p><w:pPr>{0}</w:pPr><w:r><w:rPr>{1}<w:sz w:val="{2}"/></w:rPr>{3}<w:t xml:space="preserve">{4}</w:t></w:r></w:p>' -f $jc, $b, $size, $pb, $t
    $paras.Add($p)
}

# Title Page
Add-Para "CHAROTAR UNIVERSITY OF SCIENCE AND TECHNOLOGY (CHARUSAT)" $true $true 30
Add-Para "Department of Artificial Intelligence & Machine Learning" $false $true 24
Add-Para "" $false $true 24
Add-Para "PROJECT REPORT" $true $true 34
Add-Para "on" $false $true 24
Add-Para "VIDEO AI CHROME EXTENSION FOR AUTOMATED QUIZ AND Q&A GENERATION" $true $true 28
Add-Para "FROM EDUCATIONAL VIDEOS" $true $true 28
Add-Para "" $false $true 24
Add-Para "Submitted By" $false $true 24
Add-Para "Pruthavi" $true $true 28
Add-Para "B.Tech (AI & ML)" $false $true 24
Add-Para "Academic Year: 2025-2026" $false $true 24
Add-Para "" $false $true 24
Add-Para "Guide: __________________________" $false $true 24
Add-Para "" $false $true 24 $true

# Abstract
Add-Para "ABSTRACT" $true $false 30
Add-Para "The rapid growth of video-based learning has created a need for systems that convert passive watching into active learning. This project presents a full-stack platform that generates MCQ quizzes and Q&A sets from educational videos using a Chrome extension, an Express.js backend, and a React dashboard." $false $false 24
Add-Para "The extension detects HTML5 videos, extracts transcript or page text, and sends structured context to backend APIs. The backend applies provider-fallback AI generation (Groq primary, Ollama fallback), strict JSON parsing, schema validation, and MongoDB caching to avoid duplicate generation and improve response time." $false $false 24
Add-Para "The dashboard supports authentication, history browsing, content preview, and performance analytics. Security controls include JWT authentication, request validation, rate limiting, and centralized error handling." $false $false 24
Add-Para "Keywords: Chrome Extension, AI in Education, Quiz Generation, Q&A Generation, Express.js, MongoDB, React, Groq, Ollama" $false $false 22
Add-Para "" $false $false 24 $true

# Main Sections
Add-Para "1. INTRODUCTION" $true $false 30
Add-Para "Educational video platforms contain rich conceptual explanations, but learners often need quizzes and revision material immediately after watching. Manual creation of questions is time-consuming and inconsistent. This project addresses that gap through an AI-powered browser extension that transforms watched video content into exam-ready learning artifacts." $false $false 24
Add-Para "" $false $false 24

Add-Para "2. PROBLEM STATEMENT" $true $false 30
Add-Para "Traditional video learning workflows lack immediate comprehension checks, reusable generated content, and measurable progress insights. The objective is to build a robust system that can generate meaningful quiz and Q&A content from transcripts, validate quality, store outputs efficiently, and present them through user-friendly interfaces." $false $false 24
Add-Para "" $false $false 24

Add-Para "3. OBJECTIVES" $true $false 30
Add-Para "• Build a Chrome extension that detects videos and triggers AI-assisted generation." $false $false 24
Add-Para "• Extract transcript/page text reliably from video pages." $false $false 24
Add-Para "• Generate structured quiz and Q&A content with strict JSON handling." $false $false 24
Add-Para "• Cache generated content to avoid duplicate AI calls." $false $false 24
Add-Para "• Provide dashboard and popup interfaces for browsing and reviewing content." $false $false 24
Add-Para "• Track learning performance metrics (accuracy, attempts, time spent)." $false $false 24
Add-Para "" $false $false 24

Add-Para "4. SYSTEM ARCHITECTURE" $true $false 30
Add-Para "The platform follows a three-tier architecture:" $false $false 24
Add-Para "• Presentation Layer: Chrome Extension UI (overlay + popup), React Dashboard" $false $false 24
Add-Para "• Application Layer: Node.js/Express backend for generation, validation, auth, analytics" $false $false 24
Add-Para "• Data Layer: MongoDB collections for generated content, users, performance; transcript file storage" $false $false 24
Add-Para "" $false $false 24

Add-Para "5. TECHNICAL IMPLEMENTATION" $true $false 30
Add-Para "Tech Stack:" $true $false 24
Add-Para "• Frontend: React, Vite, JavaScript, CSS" $false $false 24
Add-Para "• Backend: Node.js, Express.js" $false $false 24
Add-Para "• Database: MongoDB + Mongoose" $false $false 24
Add-Para "• AI Providers: Groq (primary), Ollama (fallback)" $false $false 24
Add-Para "• Auth: JWT, bcrypt" $false $false 24
Add-Para "Important APIs: /api/generate, /api/history, /api/history/:contentId, /api/history/:contentId/validate, /api/performance, /api/transcripts, /api/auth/*" $false $false 24
Add-Para "" $false $false 24

Add-Para "6. DATABASE DESIGN" $true $false 30
Add-Para "Collections used: GeneratedContent, User, UserPerformance. A compound unique index on (videoIdentifier, contentType, userId) enables user-aware deduplication and efficient caching." $false $false 24
Add-Para "" $false $false 24

Add-Para "7. SECURITY AND VALIDATION" $true $false 30
Add-Para "Security features include JWT-protected routes, optional auth mode for extension testing, request validation using express-validator, rate limiting for abuse prevention, bcrypt password hashing, and centralized error handling middleware." $false $false 24
Add-Para "" $false $false 24

Add-Para "8. PERFORMANCE AND ANALYTICS" $true $false 30
Add-Para "The dashboard computes total attempts, quiz vs Q&A attempts, average quiz accuracy, best score, average completion time, and cumulative learning time. Caching and AI provider fallback improve response reliability and user experience." $false $false 24
Add-Para "" $false $false 24

Add-Para "9. CHALLENGES FACED" $true $false 30
Add-Para "• Maintaining consistent JSON outputs from LLM responses" $false $false 24
Add-Para "• Handling transcript quality variance across websites" $false $false 24
Add-Para "• Managing long prompts and context windows" $false $false 24
Add-Para "• Balancing anonymous and authenticated usage flows" $false $false 24
Add-Para "" $false $false 24

Add-Para "10. FUTURE ENHANCEMENTS" $true $false 30
Add-Para "• Multi-language generation" $false $false 24
Add-Para "• Difficulty levels (easy/medium/hard)" $false $false 24
Add-Para "• Export to PDF/DOCX/flashcards" $false $false 24
Add-Para "• Personalized weak-topic recommendations" $false $false 24
Add-Para "• Cloud deployment with observability" $false $false 24
Add-Para "" $false $false 24

Add-Para "11. CONCLUSION" $true $false 30
Add-Para "The Video AI Chrome Extension demonstrates a complete end-to-end application of AI in educational productivity. It bridges browser interaction, transcript processing, AI generation, structured validation, persistent storage, and analytics-driven review. The system is practical, scalable, and suitable for academic deployment." $false $false 24
Add-Para "" $false $false 24

Add-Para "REFERENCES" $true $false 30
Add-Para "1. Chrome Extensions Documentation (Manifest V3)" $false $false 24
Add-Para "2. Express.js Official Documentation" $false $false 24
Add-Para "3. MongoDB and Mongoose Documentation" $false $false 24
Add-Para "4. React + Vite Documentation" $false $false 24
Add-Para "5. Groq API Documentation" $false $false 24
Add-Para "6. Ollama Documentation" $false $false 24
Add-Para "7. JWT (RFC 7519) Authentication Standard" $false $false 24

$documentXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
    xmlns:v="urn:schemas-microsoft-com:vml"
    xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
    xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
    xmlns:w10="urn:schemas-microsoft-com:office:word"
    xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
    xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
    xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
    xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
    xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
    mc:Ignorable="w14 wp14">
  <w:body>
    $($paras -join "`n    ")
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"@

$contentTypes = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
"@

$rels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"@

$contentTypes | Out-File -LiteralPath (Join-Path $tmpRoot "[Content_Types].xml") -Encoding utf8
$rels | Out-File -LiteralPath (Join-Path $tmpRoot "_rels\\.rels") -Encoding utf8
$documentXml | Out-File -LiteralPath (Join-Path $tmpRoot "word\\document.xml") -Encoding utf8

if (Test-Path $outDocx) { Remove-Item $outDocx -Force }
$zipOut = [System.IO.Path]::ChangeExtension($outDocx, '.zip')
if (Test-Path $zipOut) { Remove-Item $zipOut -Force }
Compress-Archive -Path (Join-Path $tmpRoot "*") -DestinationPath $zipOut
Move-Item -Path $zipOut -Destination $outDocx -Force

Write-Output "DOCX_CREATED: $outDocx"
