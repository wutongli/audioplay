    let mediaStreamg = '';
    let jsNodeg = '';
    let mediaNodeg = '';
    function record () {
        //开启本机麦克风
        window.navigator.mediaDevices.getUserMedia({
            audio: {
        sampleRate: 44100, // 输入采样率
        channelCount: 1,   // 声道
        volume: 4.0        // 音量
    }
        }).then(mediaStream => {
            mediaStreamg = mediaStream;
            beginRecord(mediaStream);
        }).catch(err => {
            // 如果用户电脑没有麦克风设备或者用户拒绝了，或者连接出问题了等
            // 这里都会抛异常，并且通过err.name可以知道是哪种类型的错误 
            console.log(err);
        })  ;
    }


    function createJSNode (audioContext) {
    const BUFFER_SIZE = 4096;
    const INPUT_CHANNEL_COUNT = 1;
    const OUTPUT_CHANNEL_COUNT = 1;
    // createJavaScriptNode已被废弃
    let creator = audioContext.createScriptProcessor || audioContext.createJavaScriptNode;
    creator = creator.bind(audioContext);
    return creator(BUFFER_SIZE,
                    INPUT_CHANNEL_COUNT, OUTPUT_CHANNEL_COUNT);
}

//获取声道的数据并保存
let leftDataList = [];
let size = 0

function onAudioProcess (event) {
    let audioBuffer = event.inputBuffer;
    let leftChannelData = audioBuffer.getChannelData(0);
    leftDataList.push(new Float32Array((leftChannelData)))
    size += leftChannelData.length
}
//开始录音
function beginRecord (mediaStream) {
    let audioContext = new (window.AudioContext || window.webkitAudioContext);
    let mediaNode = audioContext.createMediaStreamSource(mediaStream);
    // 创建一个jsNode
    let jsNode = createJSNode(audioContext);
    // 需要连到扬声器消费掉outputBuffer，process回调才能触发
    // 并且由于不给outputBuffer设置内容，所以扬声器不会播放出声音
    jsNode.connect(audioContext.destination);
    jsNode.onaudioprocess = onAudioProcess;
    // 把mediaNode连接到jsNode
    mediaNode.connect(jsNode);
    jsNodeg = jsNode;
    mediaNodeg = mediaNode;
}


//播放录音
function player(data){
    var player = new PCMPlayer({
        encoding: '16bitInt',
        channels: 2,
        sampleRate: 8000,
        flushingTime: 10,
       });
       player.volume(5);
      player.feed(data);
      leftDataList = [];
}


//播放录音
// function playRecord (arrayBuffer) {
//     let blob = new Blob([new Uint8Array(arrayBuffer)]);
//     let blobUrl = URL.createObjectURL(blob);
//     //var fileOfBlob = new File([blob], 'aFileName.json');

//     document.querySelector('audio').src = blobUrl;
// }

// function playRecord (arrayBuffer) {
//     // Safari需要使用webkit前缀
//     let AudioContext = window.AudioContext || window.webkitAudioContext,
//         audioContext = new AudioContext();
//     // 创建一个AudioBufferSourceNode对象，使用AudioContext的工厂函数创建
//     let audioNode = audioContext.createBufferSource();
//     // 解码音频，可以使用Promise，但是较老的Safari需要使用回调
//     audioContext.decodeAudioData(arrayBuffer, function (audioBuffer) {
//         console.log(audioBuffer);
//         audioNode.buffer = audioBuffer;
//         audioNode.connect(audioContext.destination); 
//         // 从0s开始播放
//         audioNode.start(0);
//     });
// }
// 停止录音

 function getData() {
      var sampleBits = 16
      var inputSampleRate = 44100
      var outputSampleRate = 12000
      var bytes = decompress(leftDataList, size, inputSampleRate, outputSampleRate)
      var dataLen = bytes.length * (sampleBits / 8)
      var buffer = new ArrayBuffer(dataLen) // For PCM , 浏览器无法播放pcm格式音频
      var data = new DataView(buffer)
      var offset = 0
      data = reshapeData(sampleBits, offset, bytes, data)
    //   return new Blob([data], { type: 'audio/pcm' })
    return data;
    }
    // 将二维数组转成一维数组
     function decompress(buffer, size, inputSampleRate, outputSampleRate) {
      var data = new Float32Array(size)
      var offset = 0
      for (var i = 0; i < buffer.length; i++) {
        data.set(buffer[i], offset)
        offset += buffer[i].length
      }
      // 降采样
      var interval = parseInt(inputSampleRate / outputSampleRate)
      var length = data.length / interval
      var result = new Float32Array(length)
      var index = 0; var j = 0
      while (index < length) {
        result[index] = data[j]
        j += interval
        index++
      }
      return result
    }
     function reshapeData(sampleBits, offset, bytes, data) {
      var s
      for (var i = 0; i < bytes.length; i++, offset += (sampleBits / 8)) {
        s = Math.max(-1, Math.min(1, bytes[i]))
        data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      }
      return data
    }
  

function stopRecord () { 
    
    mediaStreamg.getAudioTracks()[0].stop();
    mediaNodeg.disconnect();
    jsNodeg.disconnect();
    let b = getData();
    return new Int8Array(b.buffer);


}
    //g711 alaw 编解码
    let aLawDecompressTable = [-5504, -5248, -6016, -5760, -4480, -4224, -4992, -4736, -7552, -7296, -8064, -7808, -6528, -6272, -7040, -6784, -2752, -2624, -3008, -2880, -2240, -2112, -2496, -2368, -3776, -3648, -4032, -3904, -3264, -3136, -3520, -3392, -22016, -20992, -24064, -23040, -17920, -16896, -19968, -18944, -30208, -29184, -32256, -31232, -26112, -25088, -28160, -27136, -11008, -10496, -12032, -11520, -8960, -8448, -9984, -9472, -15104, -14592, -16128, -15616, -13056, -12544, -14080, -13568, -344, -328, -376,
        -360, -280, -264, -312, -296, -472, -456, -504, -488, -408, -392, -440, -424, -88, -72, -120, -104, -24, -8, -56, -40, -216, -200, -248, -232, -152, -136, -184, -168, -1376, -1312, -1504, -1440, -1120, -1056, -1248, -1184, -1888, -1824, -2016, -1952, -1632, -1568, -1760, -1696, -688, -656, -752, -720, -560, -528, -624, -592, -944, -912, -1008, -976, -816, -784, -880, -848, 5504, 5248, 6016, 5760, 4480, 4224, 4992, 4736, 7552, 7296, 8064, 7808, 6528, 6272, 7040, 6784, 2752, 2624,
        3008, 2880, 2240, 2112, 2496, 2368, 3776, 3648, 4032, 3904, 3264, 3136, 3520, 3392, 22016, 20992, 24064, 23040, 17920, 16896, 19968, 18944, 30208, 29184, 32256, 31232, 26112, 25088, 28160, 27136, 11008, 10496, 12032, 11520, 8960, 8448, 9984, 9472, 15104, 14592, 16128, 15616, 13056, 12544, 14080, 13568, 344, 328, 376, 360, 280, 264, 312, 296, 472, 456, 504, 488, 408, 392, 440, 424, 88, 72, 120, 104, 24, 8, 56, 40, 216, 200, 248, 232, 152, 136, 184, 168, 1376, 1312, 1504, 1440, 1120,
        1056, 1248, 1184, 1888, 1824, 2016, 1952, 1632, 1568, 1760, 1696, 688, 656, 752, 720, 560, 528, 624, 592, 944, 912, 1008, 976, 816, 784, 880, 848];
    aLawDecompressTable = new Int16Array(aLawDecompressTable);

    const cClip = 32635;
    let aLawCompressTable = [1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7 ];
    aLawCompressTable = new Int8Array(aLawCompressTable)

    //编码
    function encodeg711(inf,out,outOffset){
    let j = 0x00;
    let count = inf.length / 2;
    let end = outOffset+count;
    let sample = 0b0000000000000000;

    for ( let i = outOffset; i < end; i++ )
    {
    sample =  ( ( ( inf[j++] & 0xff ) | ( inf[j++] ) << 8 ) )   ;
    out[i] = linearToALawSample( sample )

    }
    return count;
    }

    function linearToALawSample( sample ){
    let sign;
    let exponent;
    let mantissa;
    let s;

    sign = ( ( ~sample ) >> 8 ) & 0x80;
    if ( !( sign == 0x80 ) )
    {
    sample =  -sample;
    }
    if ( sample > cClip )
    {
    sample = cClip;
    }
    if ( sample >= 256 )
    {
    exponent = aLawCompressTable[( sample >> 8 ) & 0x7F];
    mantissa = ( sample >> ( exponent + 3 ) ) & 0x0F;
    s = ( exponent << 4 ) | mantissa;
    }
    else
    {
    s = sample >> 4;
    }
    s ^= ( sign ^ 0x55 );
    return s;
    } 
    
    /**
    * 解码
    * @param byte[] b
    * @return
    */
    function decode(b){
    let j = 0;
    let res = new Int8Array(b.length*2);
    for ( let i = 0; i < b.length; i++ )
    {
    let s = aLawDecompressTable[b[i] & 0xff];
    res[j++] = s;
    res[j++] =  s >> 8 ;
    }
    return res;
    }

//上传到服务器
function upload(blob) {
      
    var formData = new FormData();
    formData.append("file", blob,'aaa.raw');
        //上传数据
        $.ajax({
            url: 'http://localhost:3000/audio',
            type: 'post',
            processData: false,
            contentType: false,
            data: formData,
            dataType: 'json',
            success: function (res) {
                
            },
            error: function (jqXHR, textStatus, errorThrown) {
                alert(textStatus + "---" + errorThrown);
            }
        });
    }