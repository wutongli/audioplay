const app = require('express')();
const fs = require('fs');
const path = require('path');
const multiparty = require('multiparty')
const cors = require('cors')

app.get('/',cors(corsOptions),(req,res)=>{
    //res.header("Access-Control-Allow-Origin", "*");
    fs.readFile('./playaudio/upload/aB_UmTx7OLL-nNo6RH5t2ymU',(err,data)=>{ 
       res.json(JSON.stringify(data));
    })
   // res.sendfile('./playaudio/upload/kvGyDIwUJkmFCRrKnGgfsiNh.raw')
})
var corsOptions = {
  origin: '*', 
  optionsSuccessStatus: 200 
}

app.use(cors({
  origin:['http://localhost:8080'],
  methods:['GET','POST'],
  alloweHeaders:['Conten-Type', 'Authorization']
}));
//设置跨域请求
app.all('*', cors(corsOptions),function (req, res, next) {  
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
  });
// app.use(async (req, res, next)=> {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Expose-Headers', '*');
//   res.header('Access-Control-Allow-Headers', 'content-disposition,Content-Disposition,token, x-access-token,origin, content-type, Content-Type, Content-Length, Authorization, Accept, X-Requested-With, yourHeaderFeild');
//   res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, OPTIONS');
//   res.header('X-Powered-By',config.iss);
//   if(req.method == 'OPTIONS') {
//     res.sendStatus(204);
//     return;
//   }
//   // if(req.url == '/' && req.method == 'GET'){
//   //   let userAgent = req.headers['user-agent'].toLowerCase();
//   //   if(~userAgent.indexOf('android') || ~userAgent.indexOf('iphone')){
//   //     res.writeHead(301, {'Location': '/app.html'});
//   //   }else{
//   //     res.writeHead(301, {'Location': '/login.html'});
//   //   }
//   //   res.end();
//   //   return;
//   // }
//   next();
// });
app.post('/audio',(req,res)=>{
    //生成multiparty对象，并配置上传文件保存路径
  let form = new multiparty.Form({
    uploadDir: './playaudio/upload/'
  });
  form.parse(req);
  form.on('field', (name, value) => { // 接收到数据参数时，触发field事件
    console.log(name, value)
  })

   form.on('file', (name, file, ...rest) => { // 接收到文件参数时，触发file事件
    console.log(file)
  })

  form.on('close', () => {  // 表单数据解析完成，触发close事件
    console.log('表单数据解析完成')
    res.send(200,{code:'0',mes:'成功'});
    //res.sendStatus(200);
  })

})
app.listen('3000',()=>{
    console.log('server start')
})