# Run from the jaela-serenity-villa-dev-clean repository root.
$ErrorActionPreference = "Stop"

if (!(Test-Path ".\tools\setup-pay-tests.ps1")) {
    throw "Run this from the jaela-serenity-villa-dev-clean repository root."
}

@'
const http=require("http");
const H="127.0.0.1",P=8080,PROJ="ja-ela-serenity-villa-test";
const BASE=`/v1/projects/${PROJ}/databases/(default)/documents/bookings`;
const REFS=new Set(["DIRECT-PAY-TEST-018","DIRECT-PAY-TEST-019","DIRECT-PAY-TEST-020","DIRECT-PAY-TEST-021","DIRECT-PAY-TEST-022","DIRECT-PAY-TEST-023","DIRECT-PAY-TEST-024","DIRECT-PAY-TEST-026","DIRECT-PAY-TEST-027","DIRECT-PAY-TEST-028"]);
function req(method,path){return new Promise((ok,bad)=>{const r=http.request({hostname:H,port:P,path,method},res=>{let b="";res.on("data",x=>b+=x);res.on("end",()=>ok({code:res.statusCode,body:b}));});r.on("error",bad);r.end();});}
(async()=>{const r=await req("GET",`${BASE}?pageSize=100`);if(r.code!==200)throw Error(`Emulator unavailable: HTTP ${r.code}`);const docs=(JSON.parse(r.body).documents||[]).filter(d=>REFS.has(d.fields?.bookingReference?.stringValue));console.log(`Found ${docs.length} existing payment-test documents.`);for(const d of docs){const id=d.name.split("/").pop(),ref=d.fields.bookingReference.stringValue,x=await req("DELETE",`${BASE}/${encodeURIComponent(id)}`);if(x.code!==200)throw Error(`Delete failed: ${ref}`);console.log(`DELETED ${ref} / ${id}`);}console.log("Cleanup complete.");})().catch(e=>{console.error("CLEANUP FAILED:",e.message);process.exit(1);});
'@ | Set-Content ".\tools\clean-pay-tests-018-028.js" -Encoding UTF8

@'
const http=require("http");
const H="127.0.0.1",P=8080,PROJ="ja-ela-serenity-villa-test";
const BASE=`/v1/projects/${PROJ}/databases/(default)/documents/bookings`;
const E={
"DIRECT-PAY-TEST-018":["Deposit Required",0,225,"Balance Due",false,"Confirmed"],
"DIRECT-PAY-TEST-019":["Deposit Paid",100.5,124.5,"Balance Due",false,"Confirmed"],
"DIRECT-PAY-TEST-020":["Paid",225,0,"Paid",true,"Confirmed"],
"DIRECT-PAY-TEST-021":["Deposit Required",0,225,"Balance Due",false,"Cancelled"],
"DIRECT-PAY-TEST-022":["Deposit Required",0,225,"Balance Due",false,"Pending"],
"DIRECT-PAY-TEST-023":["Deposit Checkout Created",0,225,"Balance Due",false,"Confirmed"],
"DIRECT-PAY-TEST-024":["Deposit Paid",225,0,"Paid",true,"Confirmed"],
"DIRECT-PAY-TEST-026":["Payment Review Required",0,225,undefined,undefined,"Confirmed"],
"DIRECT-PAY-TEST-027":["Deposit Paid",100,125,"Balance Due",false,"Confirmed"],
"DIRECT-PAY-TEST-028":["Deposit Required",0,225,"Balance Due",false,"Confirmed"]};
function req(path){return new Promise((ok,bad)=>{http.get({hostname:H,port:P,path},res=>{let b="";res.on("data",x=>b+=x);res.on("end",()=>ok({code:res.statusCode,body:b}));}).on("error",bad);});}
function v(f,n){const x=f?.[n];if(!x)return undefined;return x.stringValue!==undefined?x.stringValue:x.doubleValue!==undefined?Number(x.doubleValue):x.integerValue!==undefined?Number(x.integerValue):x.booleanValue!==undefined?x.booleanValue:undefined;}
(async()=>{const r=await req(`${BASE}?pageSize=100`);if(r.code!==200)throw Error(`Emulator unavailable: HTTP ${r.code}`);const docs=JSON.parse(r.body).documents||[],m={};for(const d of docs){const ref=v(d.fields,"bookingReference");if(ref)(m[ref]??=[]).push(d);}
let bad=0;for(const [ref,e] of Object.entries(E)){const a=m[ref]||[];if(a.length!==1){console.log(`FAIL ${ref}: expected 1 document, found ${a.length}`);bad++;continue;}const f=a[0].fields,vals=[v(f,"paymentStatus"),v(f,"depositAmount"),v(f,"balanceAmount"),v(f,"balancePaymentStatus"),v(f,"balancePaid"),v(f,"status")];const checks=[vals[0]===e[0],Number(vals[1])===e[1],Number(vals[2])===e[2],e[3]===undefined||vals[3]===e[3],e[4]===undefined||vals[4]===e[4],vals[5]===e[5]];if(checks.every(Boolean))console.log(`PASS ${ref}`);else{console.log(`FAIL ${ref}: ${JSON.stringify(vals)}`);bad++;}}
const absent=m["DIRECT-PAY-TEST-025"]||[];if(absent.length===0)console.log("PASS DIRECT-PAY-TEST-025 - absent");else{console.log(`FAIL DIRECT-PAY-TEST-025 - found ${absent.length}`);bad++;}
if(bad)process.exit(1);console.log("ALL AUTOMATED PAYMENT TESTS PASSED");})().catch(e=>{console.error("VERIFY FAILED:",e.message);process.exit(1);});
'@ | Set-Content ".\tools\verify-pay-tests-018-028.js" -Encoding UTF8

@'
$ErrorActionPreference="Stop"
Write-Host "=== AUTOMATED DEV PAYMENT VERIFICATION ===" -ForegroundColor Cyan
node --check .\assets\js\external-booking.js
if($LASTEXITCODE){throw "external-booking.js syntax failed"}
node --check .\assets\js\payment.js
if($LASTEXITCODE){throw "payment.js syntax failed"}
node --check .\functions\index.js
if($LASTEXITCODE){throw "functions/index.js syntax failed"}
node .\tools\clean-pay-tests-018-028.js
if($LASTEXITCODE){throw "Cleanup failed"}
.\tools\setup-pay-tests.ps1 -CreateBookings
if($LASTEXITCODE){throw "Test data creation failed"}
node .\tools\verify-pay-tests-018-028.js
if($LASTEXITCODE){throw "Automated verification failed"}
Write-Host "=== DEV PAYMENT TESTS PASSED ===" -ForegroundColor Green
'@ | Set-Content ".\tools\run-pay-tests-dev.ps1" -Encoding UTF8

Write-Host "Created/updated automated test tooling:" -ForegroundColor Green
Write-Host "  tools\clean-pay-tests-018-028.js"
Write-Host "  tools\verify-pay-tests-018-028.js"
Write-Host "  tools\run-pay-tests-dev.ps1"
Write-Host ""
Write-Host "NEXT: .\tools\run-pay-tests-dev.ps1" -ForegroundColor Yellow
