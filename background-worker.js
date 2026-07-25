/* Low-frequency background simulation clock.
   One outstanding tick at a time prevents message queues from growing while
   the browser has suspended the page. */
'use strict';
let running=false,waiting=false,timer=0;
function schedule(){clearTimeout(timer);if(!running)return;timer=setTimeout(()=>{if(!waiting){waiting=true;postMessage({type:'tick',now:Date.now()})}schedule()},100)}
onmessage=e=>{if(e.data==='start'){running=true;waiting=false;schedule()}else if(e.data==='stop'){running=false;waiting=false;clearTimeout(timer)}else if(e.data==='ack')waiting=false};
