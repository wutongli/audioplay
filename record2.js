    let mediaStreamg = '';
    let jsNodeg = '';
    let mediaNodeg = '';
    function record () {
        //开启本机麦克风
        window.navigator.mediaDevices.getUserMedia({
            audio: {
        sampleRate: 8000, // 输入采样率
        channelCount: 2,   // 声道
        volume: 2.0        // 音量
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
    const INPUT_CHANNEL_COUNT = 2;
    const OUTPUT_CHANNEL_COUNT = 2;
    // createJavaScriptNode已被废弃
    let creator = audioContext.createScriptProcessor || audioContext.createJavaScriptNode;
    creator = creator.bind(audioContext);
    return creator(BUFFER_SIZE,
                    INPUT_CHANNEL_COUNT, OUTPUT_CHANNEL_COUNT);
    }


    let leftDataList = [],
    rightDataList = [];
    //获取左右声道的数据并保存
    function onAudioProcess (event) {
        let audioBuffer = event.inputBuffer;
        let leftChannelData = audioBuffer.getChannelData(0),
            rightChannelData = audioBuffer.getChannelData(1);
        // 需要克隆一下
        leftDataList.push(leftChannelData.slice(0));
        rightDataList.push(rightChannelData.slice(0));
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

    //合并多个Float32Array
    function mergeArray (list) {    
        let length = list.length * list[0].length;
        let data = new Float32Array(length),
            offset = 0;
        for (let i = 0; i < list.length; i++) {
            data.set(list[i], offset);
            offset += list[i].length;
        }
        return data;
    }   


    //交叉合并左右声道的数据
    function interleaveLeftAndRight (left, right) {
        let totalLength = left.length + right.length;
        let data = new Float32Array(totalLength);
        for (let i = 0; i < left.length; i++) {
            let k = i * 2;
            data[k] = left[i];
            data[k + 1] = right[i];
        }
        return data;
    }
    //创建wav音频文件
    function createWavFile (audioData) {
        const WAV_HEAD_SIZE = 44;
        let buffer = new ArrayBuffer(audioData.length * 2 + WAV_HEAD_SIZE),
            // 需要用一个view来操控buffer
            view = new DataView(buffer);
        // 写入wav头部信息
        // RIFF chunk descriptor/identifier
        writeUTFBytes(view, 0, 'RIFF');
        // RIFF chunk length
        view.setUint32(4, 44 + audioData.length * 2, true);
        // RIFF type
        writeUTFBytes(view, 8, 'WAVE');
        // format chunk identifier
        // FMT sub-chunk
        writeUTFBytes(view, 12, 'fmt ');
        // format chunk length
        view.setUint32(16, 16, true);
        // sample format (raw)
        view.setUint16(20, 1, true);
        // stereo (2 channels)
        view.setUint16(22, 2, true);
        // sample rate
        view.setUint32(24, 41000, true);
        // byte rate (sample rate * block align)
        view.setUint32(28, 41000 * 2, true);
        // block align (channel count * bytes per sample)
        view.setUint16(32, 2 * 2, true);
        // bits per sample
        view.setUint16(34, 16, true);
        // data sub-chunk
        // data chunk identifier
        writeUTFBytes(view, 36, 'data');
        // data chunk length
        view.setUint32(40, audioData.length * 2, true);
        // 写入PCM数据
        let length = audioData.length;
        let index = 44;
        let volume = 1;
        for (let i = 0; i < length; i++) {
            view.setInt16(index, audioData[i] * (0x7FFF * volume), true);
            index += 2;
        }
        return buffer;


    }

    function writeUTFBytes (view, offset, string) {
        var lng = string.length;
        for (var i = 0; i < lng; i++) { 
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // //播放录音
    function playRecord (bytes) {
        //console.log(bytes);
        let res = decode(bytes);
        //let blob = new Blob([new Uint8Array(arrayBuffer)]);
        let blob = new Blob([res],{
            type: "audio/pcm"
        })
        let blobUrl = URL.createObjectURL(blob);
        
        
        document.querySelector('audio').src = blobUrl;
    }

    // function playRecord (b) {
    //     let arrayBuffer = b.buffer;
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
function stopRecord () { 
    
    mediaStreamg.getAudioTracks()[0].stop();
    mediaNodeg.disconnect();
    jsNodeg.disconnect();

    let leftData = mergeArray(leftDataList),
        rightData = mergeArray(rightDataList);
    let allData = interleaveLeftAndRight(leftData, rightData);
    
    let wavBuffer = createWavFile(allData);
   
     let s = new Int8Array(wavBuffer);
    //  let bytes = new Array(allData.length/2);
     let bytes = new Int8Array(s.length/2);
    
    encodeg711(s,bytes,0);
    //  console.log(bytes);
    return bytes;
   
    // let blob = new Blob([JSON.stringify(new Uint8Array(bytes))],{
    //      type: "application/json"
    //  });
    //  return blob;
    //  let blob = new Blob([data],{
    //     type: "application/octet-binary"
    //  });
    //upload(blob);
    
   // playRecord(bytes);
}

// pcm编码
// function encodePCM(bytes) {
     
//     let sampleBits = 8,
//         offset = 0,
//         dataLength = bytes.length * (sampleBits / 8),
//         buffer = new ArrayBuffer(dataLength),
//         data = new DataView(buffer);

//     // 写入采样数据 
//     if (sampleBits === 8) {
//         for (var i = 0; i < bytes.length; i++, offset++) {
//             // 范围[-1, 1]
//             var s = Math.max(-1, Math.min(1, bytes[i]));
//             // 8位采样位划分成2^8=256份，它的范围是0-255; 16位的划分的是2^16=65536份，范围是-32768到32767
//             // 因为我们收集的数据范围在[-1,1]，那么你想转换成16位的话，只需要对负数*32768,对正数*32767,即可得到范围在[-32768,32767]的数据。
//             // 对于8位的话，负数*128，正数*127，然后整体向上平移128(+128)，即可得到[0,255]范围的数据。
//             var val = s < 0 ? s * 128 : s * 127;
//             val = parseInt(val + 128);
//             data.setInt8(offset, val, true);
//         }
//     } else {
//         for (var i = 0; i < bytes.length; i++, offset += 2) {
//             var s = Math.max(-1, Math.min(1, bytes[i]));
//             // 16位直接乘就行了
//             data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
//         }
//     }

//     return data;



 let aLawDecompressTable = [-5504, -5248, -6016, -5760, -4480, -4224, -4992, -4736, -7552, -7296, -8064, -7808, -6528, -6272, -7040, -6784, -2752, -2624, -3008, -2880, -2240, -2112, -2496, -2368, -3776, -3648, -4032, -3904, -3264, -3136, -3520, -3392, -22016, -20992, -24064, -23040, -17920, -16896, -19968, -18944, -30208, -29184, -32256, -31232, -26112, -25088, -28160, -27136, -11008, -10496, -12032, -11520, -8960, -8448, -9984, -9472, -15104, -14592, -16128, -15616, -13056, -12544, -14080, -13568, -344, -328, -376,
                    -360, -280, -264, -312, -296, -472, -456, -504, -488, -408, -392, -440, -424, -88, -72, -120, -104, -24, -8, -56, -40, -216, -200, -248, -232, -152, -136, -184, -168, -1376, -1312, -1504, -1440, -1120, -1056, -1248, -1184, -1888, -1824, -2016, -1952, -1632, -1568, -1760, -1696, -688, -656, -752, -720, -560, -528, -624, -592, -944, -912, -1008, -976, -816, -784, -880, -848, 5504, 5248, 6016, 5760, 4480, 4224, 4992, 4736, 7552, 7296, 8064, 7808, 6528, 6272, 7040, 6784, 2752, 2624,
                    3008, 2880, 2240, 2112, 2496, 2368, 3776, 3648, 4032, 3904, 3264, 3136, 3520, 3392, 22016, 20992, 24064, 23040, 17920, 16896, 19968, 18944, 30208, 29184, 32256, 31232, 26112, 25088, 28160, 27136, 11008, 10496, 12032, 11520, 8960, 8448, 9984, 9472, 15104, 14592, 16128, 15616, 13056, 12544, 14080, 13568, 344, 328, 376, 360, 280, 264, 312, 296, 472, 456, 504, 488, 408, 392, 440, 424, 88, 72, 120, 104, 24, 8, 56, 40, 216, 200, 248, 232, 152, 136, 184, 168, 1376, 1312, 1504, 1440, 1120,
                    1056, 1248, 1184, 1888, 1824, 2016, 1952, 1632, 1568, 1760, 1696, 688, 656, 752, 720, 560, 528, 624, 592, 944, 912, 1008, 976, 816, 784, 880, 848];
  aLawDecompressTable = new Int16Array(aLawDecompressTable);

const cClip = 32635;
let aLawCompressTable = [1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7 ];
 aLawCompressTable = new Int8Array(aLawCompressTable)
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
     * @param b
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
        formData.append("file", blob,"aaa.pcm");
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
