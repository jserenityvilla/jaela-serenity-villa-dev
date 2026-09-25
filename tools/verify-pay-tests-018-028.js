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
