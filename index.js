const express = require('express');
// const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const shortid = require('shortid');
const dotenv = require('dotenv');
const cors = require("cors");
// const i18n = require('./i18n.js.config');
// i18n.__('settings_command_menu_sett')
const bodyParser = require('body-parser');
const webpush = require('web-push');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();

dotenv.config();
app.use(express.json());
app.use(cors());
app.options("*", cors());

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));
var path = require('path');
const STATIC_PATH = path.join(__dirname, './public')
// 정적 파일을 제공하는 미들웨어 등록
app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const secretKey = process.env.COOKIE_SECRETKEY;
//#########################################################################
// 다국어 처리
const i18n = require('i18n');
i18n.configure({
    locales: ['en', 'ko', 'jp', 'ru', 'cn', 'ar', 'es'],
    directory: path.join(__dirname, 'locales'),
    defaultLocale: 'ko',
    cookie: 'lang',
    queryParameter: 'lang',
    autoReload: true, // 파일 변경 시 자동으로 로드
    updateFiles: false, // 기본 파일 업데이트 방지
    objectNotation: true // 중첩된 JSON 객체 허용
});
app.use(i18n.init);

// 미들웨어를 사용하여 모든 요청에 대해 로케일을 설정
app.use((req, res, next) => {
    const locale = req.query.lang || req.cookies.lang || 'ko';
    res.setLocale(locale);
    next();
});
//#########################################################################

// MySQL 데이터베이스 연결 설정
const mysql = require("mysql2/promise");
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE
};
const pool = mysql.createPool(dbConfig);
const getConn = async() => {
    return await pool.getConnection(async (conn) => conn);
    // return await pool.getConnection();
}
async function loadDB(strSQL){
    const connection = await getConn();
    let [rows] = await connection.query(strSQL);
    // console.log(strSQL);
    connection.release();
    // return rows[0];
    return rows;
    // loadDB 함수 호출
    // loadDB(strSQL)
    // .then(result => {
    //     console.log(result); // 쿼리 결과 출력
    // })
    // .catch(err => {
    //     console.error(err); // 오류 처리
    // });
}

async function saveDB(strSQL){
  const connection = await getConn();
  try {
      await connection.beginTransaction();
      await connection.query(strSQL);
      await connection.commit();
      // console.log('success!');
  } catch (err) {
      await connection.rollback();
      // throw err;
      console.log(getCurTimestamp() +' ' + err.sqlMessage);
  } finally {
      connection.release();
  }
}

//#########################################################################
//#########################################################################
const _sendAmt = "0.0001";
const _regMiningQty = "0.5";  // 회원가입시의 CEIK Qty
const Qty_CeikPerSec = "0.000011574"; // 1초당 얻는 CEIK (1일 1CEIK) 2024-05-21
//#########################################################################
//#########################################################################
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.AAH_RPC));

const algorithm = process.env.AES_ALG;
const key = process.env.AES_KEY; // key (32 바이트)
const iv = process.env.AES_IV; // Initialization Vector (16 바이트)


const tokenABI = JSON.parse('[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"sender","type":"address"},{"name":"recipient","type":"address"},{"name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"recipient","type":"address"},{"name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"name","type":"string"},{"name":"symbol","type":"string"},{"name":"decimals","type":"uint8"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"}]'); 
const Tx = require('ethereumjs-tx').Transaction;
// ERC-20 토큰 계약 주소
const tokenAddress = '0x18814b01b5cc76f7043e10fd268cc4364df47da0';
// 개인 키
const privateKey = Buffer.from(process.env.AAH_BANK_PRVKEY, 'hex');
// ERC-20 토큰 계약 인스턴스 생성
const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);

async function fn_sendMining(send_addr, rcv_addr, rcv_amt, fromId, user_ip){
    let tr_msg = "";
    let sqls1 = "update users set reqAAH_ingYN='Y' WHERE userIdx ='"+fromId+"'";
    saveDB(sqls1);
    try
    {
        // 토큰 전송 함수 호출
        // console.log(rcv_amt +" : rcv_amt");
        const rcv_amt_numeric = parseFloat(rcv_amt); // 문자열을 숫자로 변환
        let _rcv_amt = 0;
        if (!isNaN(rcv_amt_numeric)) {
            _rcv_amt = rcv_amt_numeric.toFixed(8); // 소수점 이하 8자리로 반올림
            // console.log(_rcv_amt);
        } else {
            console.error("rcv_amt is not a valid number");
        }
        // const sendceikValueWei = web3.utils.toWei(_rcv_amt.toString(), 'ether');
        // const txData = tokenContract.methods.transfer(rcv_addr, sendceikValueWei).encodeABI();

        const sendceikValue = web3.utils.toWei(_rcv_amt.toString(), 'ether') / Math.pow(10, 10); // 에궁 CEIK 는 8자리다 ㅠㅠ 18-10 = 8
        // console.log(sendceikValue +" : sendceikValue");
        const txData = tokenContract.methods.transfer(rcv_addr, sendceikValue).encodeABI(); // 트랜잭션 데이터 생성

        // Klaytn 지갑을 사용하여 트랜잭션 서명을 위한 계정 생성
        const senderAccount = web3.eth.accounts.privateKeyToAccount(process.env.AAH_BANK_PRVKEY);
        
        // 계정 주소 확인
        const senderAddress = senderAccount.address;
        
        // 트랜잭션 생성
        const rawTx = {
            from: senderAddress,
            to: tokenContract.options.address,
            gas: 200000, // 가스 한도
            data: txData
        };
        
        // 트랜잭션 서명
        web3.eth.accounts.signTransaction(rawTx, process.env.AAH_BANK_PRVKEY)
            .then((signedTx) => {
                // 서명된 트랜잭션 전송
                web3.eth.sendSignedTransaction(signedTx.rawTransaction)
                    // .on('transactionHash', (hash) => {
                    //     console.log('트랜잭션 해시:', hash);
                    // })
                    .once('receipt', (receipt) => {
                        // console.log('트랜잭션 영수증:', receipt);
                        // 트랜잭션이 성공적으로 처리되었으므로 후속 작업 수행
                        fn_send_tx_log(fromId, send_addr, rcv_addr, sendceikValue, receipt.blockNumber, receipt.contractAddress, receipt.blockHash, receipt.transactionHash,"CEIK_MINING",user_ip);
                        web3.eth.getBalance(rcv_addr, function(error, result) {
                            let wallet_balance = web3.utils.fromWei(result, "ether") +" CEIK";
                            let _hash = receipt.transactionHash;
                            tr_msg = tr_msg + rcv_addr +" : rcv_addr / " + sendceikValue +" : rcv_amt / "+ wallet_balance +" : wallet_balance / "+ _hash +" : _hash";
                            let sqls2 = "update users set reqAAH_ingYN='N', aah_balance='0', last_reg=now() WHERE userIdx ='"+fromId+"'";
                            saveDB(sqls2);
                            // return tr_msg;
                        });
                    })
                    .on('error', (error) => {
                        console.error('트랜잭션 전송 중 오류 발생:', error);
                    });
            })
            .catch((error) => {
                console.error('트랜잭션 서명 중 오류 발생:', error);
            });
    }catch(e){
        // i18n.__('mining_lang_send_mining_failure_aah') //#### AAH_MINING 발송 ####\n채굴중 문제가 발생 하였습니다.
        tr_msg = tr_msg +" ["+ e +"] " + i18n.__('mining_lang_send_mining_failure_aah');
        // console.log("158 : "+e);
    }
    //////////
    // console.log("161 tr_msg : "+tr_msg);
    return tr_msg;
}


app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// / 와 mining
app.get('/mining', async (req, res) => {
    res.redirect('/');
});

app.get('/', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
    } else {
        let _email = req.session.email;
        let _userIdx = req.session.userIdx;
        let _aah_real_balance = "0";
        let _aah_balance = "0";
        let _reffer_id = "0";
        let _reffer_cnt = "0";
        let _pub_key = "";
        let _user_add_addr = "";
        let _level = "1";
        let _exp = "0";
        let _point = "0";

        let sql = "SELECT userIdx, pub_key, aah_balance, aah_real_balance, reffer_id, reffer_cnt, user_add_addr, level, exp, point FROM users WHERE userIdx='" + _userIdx + "'";
        let result = await loadDB(sql);
        if (result.length > 0) {
            _aah_balance = result[0].aah_balance;
            _reffer_id = result[0].reffer_id;
            _reffer_cnt = result[0].reffer_cnt;
            _pub_key = result[0].pub_key;
            _aah_real_balance = result[0].aah_real_balance;
            _user_add_addr = result[0].user_add_addr;
            _level = result[0].level;
            _exp = result[0].exp;
            _point = result[0].point;
        }

        let sql1 = "SELECT COUNT(midx) cnt FROM mininglog WHERE useridx = '" + _userIdx + "'";
        let result1 = await loadDB(sql1);
        let _cnt = result1[0].cnt;
        let _ing_sec = 0;
        if (_cnt > 0) {
            let sql2 = "SELECT TIMESTAMPDIFF(second, regdate, NOW()) AS sec FROM mininglog WHERE useridx='" + _userIdx + "' AND midx=(SELECT MAX(midx) FROM mininglog WHERE useridx='" + _userIdx + "')";
            let result2 = await loadDB(sql2);
            _ing_sec = result2[0].sec;
        }
        if (_ing_sec > 86400) { _ing_sec = 86400; }

        // ########################### start boost #### 부스터 id 로 접근해야 하지만 부스터는 하나씩 쓴다고 가정 하고 userIdx 로 접근
        let add_sec = 0;
        let sql12 = "SELECT ROUND((multiplier*duration) - (duration)) add_sec FROM boosters WHERE userIdx='" + _userIdx + "' and useYN='Y' and processYN='N'";
        let result12 = await loadDB(sql12);
        if (result12.length > 0) {
            add_sec = result12[0].add_sec;
        }
        if(add_sec>0){
            let sql13 = "update boosters SET processYN='Y' WHERE userIdx='" + _userIdx + "' and useYN='Y' and processYN='N'";
            let result13 = await saveDB(sql13);
        }
        // 시간을 더해 주고 부스터는 종료 처리
        _ing_sec = _ing_sec + add_sec;
        // ########################### end boost ####
        
        let sql5 = "SELECT COUNT(party_idx) party_cnt FROM party_member WHERE user_idx = '" + _userIdx + "'";
        let result5 = await loadDB(sql5);
        let _party_cnt = result5[0].party_cnt;
        let _party_mem_cnt = 0;
        if (_party_cnt > 0) {
            let sql6 = "SELECT count(idx) party_mem_cnt FROM party_member WHERE party_idx=(SELECT party_idx FROM party_member WHERE user_idx='" + _userIdx + "')";
            let result6 = await loadDB(sql6);
            _party_mem_cnt = result6[0].party_mem_cnt;
        }

        let sql6 = "SELECT COUNT(userIdx) subsc_cnt FROM subscriptions WHERE userIdx = '" + _userIdx + "'";
        let result6 = await loadDB(sql6);
        let _subsc_cnt = result6[0].subsc_cnt;

        // 사용자 채굴 설정 가져오기 및 없으면 기본 값 삽입
        let sqlMining = "SELECT rate, frequency FROM mining_settings WHERE userIdx = '" + _userIdx + "'";
        let resultMining = await loadDB(sqlMining);
        let miningRate, miningFrequency;

        if (resultMining.length > 0) {
            miningRate = resultMining[0].rate;
            miningFrequency = resultMining[0].frequency;
        } else {
            miningRate = 1; // 기본 채굴 속도 24시간 1 CEIK
            miningFrequency = 24; // 기본 빈도 (24시간)

            // 기본 값 삽입
            let insertMining = `
                INSERT INTO mining_settings (userIdx, rate, frequency)
                VALUES (?, ?, ?)
            `;
            await loadDB(mysql.format(insertMining, [_userIdx, miningRate, miningFrequency]));
        }

        let _boost_id="", _bname="", _multiplier="", _duration="", _active="";
        let getBoostersQuery = `SELECT id, userIdx, bname, multiplier, duration, active FROM boosters WHERE userIdx = ${_userIdx} and useYN='N' LIMIT 5 `;
        let boosters = await loadDB(getBoostersQuery);
        if (boosters.length > 0) {
            _boost_id = boosters[0].id;
            _bname = boosters[0].bname;
            _multiplier = boosters[0].multiplier;
            _duration = boosters[0].duration;
            _active = boosters[0].active;
        }
        res.render('mining', {
            email: _email, userIdx: _userIdx,
            party_mem_cnt: _party_mem_cnt,
            reffer_id: _reffer_id, reffer_cnt: _reffer_cnt,
            aah_address: _pub_key, aah_balance: _aah_balance, aah_real_balance: _aah_real_balance,
            ing_sec: _ing_sec,
            user_add_addr: _user_add_addr,
            VAPID_PUBLIC: publicVapidKey,
            subsc_cnt: _subsc_cnt,
            miningRate: miningRate,
            miningFrequency: miningFrequency,
            Qty_CeikPerSec: Qty_CeikPerSec,
            level : _level,exp : _exp, point: _point,
            boost_id:_boost_id,bname:_bname, multiplier:_multiplier, duration:_duration, active:_active
            ,locale: req.getLocale()
        });
    }
});

app.post('/update-mining-settings', async (req, res) => {
    const { userIdx, rate, frequency } = req.body;
    const sql = `
        INSERT INTO mining_settings (userIdx, rate, frequency)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE rate=VALUES(rate), frequency=VALUES(frequency)
    `;

    try {
        await loadDB(mysql.format(sql, [userIdx, rate, frequency]));
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error updating mining settings:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});


app.get('/main', (req, res) => {
    res.render('main');
});

app.get('/login', (req, res) => {
    res.render('login', { locale: req.getLocale() });
});

app.post('/login', async (req, res) => {
    let err_msg = "";
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
        err_msg = "EMAIL과 비밀번호를 모두 입력해주세요.";
        res.render('error', { err_msg });
        return;
    }

    let sql = `SELECT *, DATE_FORMAT(loginDailydate, '%y%m%d') AS loginDailyYYYYMMDD, 
               DATE_FORMAT(now(), '%y%m%d') AS curYYYYMMDD, 
               IFNULL(user_add_addr, '') as user_new_addr 
               FROM users WHERE email = ?`;
    let result = await loadDB(mysql.format(sql, [email]));

    if (result.length > 0) {
        if (!(await bcrypt.compare(password, result[0].password))) {
            err_msg = "EMAIL 또는 비밀번호가 올바르지 않습니다.";
            res.render('error', { err_msg });
            return;
        }
    } else {
        err_msg = "회원가입을 먼저 하세요.";
        res.render('error', { err_msg });
        return;
    }

    let search_addr = result[0].pub_key;
    if (result[0].user_new_addr.length > 20) {
        search_addr = result[0].user_new_addr;
    }

    let _aah_real_balance = await getBalanceCEIK(search_addr);
    req.session.email = email;
    req.session.userIdx = result[0].userIdx;
    let _loginDailyYYYYMMDD = result[0].loginDailyYYYYMMDD;
    let _curYYYYMMDD = result[0].curYYYYMMDD;

    let sql2 = "";
    if (_loginDailyYYYYMMDD == _curYYYYMMDD) {
        sql2 = `UPDATE users SET aah_real_balance='${_aah_real_balance}', 
                loginCnt=loginCnt+1, exp=exp+1, logindate=now(), reqAAH_ingYN='N' 
                WHERE userIdx='${result[0].userIdx}'`;
    } else {
        sql2 = `UPDATE users SET aah_real_balance='${_aah_real_balance}', 
                loginCnt=loginCnt+1, exp=exp+1, loginDailyCnt=loginDailyCnt+1, 
                logindate=now(), loginDailydate=now() 
                WHERE userIdx='${result[0].userIdx}'`;
    }

    try {
        await saveDB(sql2);
    } catch (e) {
        console.error(e);
    }

    if (rememberMe) {
        const token = jwt.sign({ userIdx: result[0].userIdx, email: result[0].email }, secretKey, { expiresIn: '7d' });
        res.cookie('authToken', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });  // 7일
    }

    res.redirect('/');
});

// 미들웨어: 자동 로그인 처리
app.use(async (req, res, next) => {
    if (!req.session.userIdx && req.cookies.authToken) {
        try {
            const decoded = jwt.verify(req.cookies.authToken, secretKey);
            req.session.userIdx = decoded.userIdx;
            req.session.email = decoded.email;
        } catch (error) {
            console.error('Invalid token', error);
        }
    }
    next();
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    let { email, password } = req.body;
    if (!email || !password) {
        // return res.status(400).send('EMAIL과 비밀번호를 모두 입력해주세요.');
        err_msg= err_msg +"EMAIL과 비밀번호를 모두 입력해주세요.";
        res.render('error', { err_msg:err_msg});
        return;
    }
    email = jsfnRepSQLinj(email);
    password = jsfnRepSQLinj(password);
    let sql0 = "SELECT count(userIdx) cnt FROM users WHERE email='"+email+"'" ;
    let result0 = await loadDB(sql0);
    let _cnt = result0[0].cnt;
    if(_cnt>0){
        let _errAlert = "<script>alert('이미 존재 하는 EMAIL 입니다.');document.location.href='/signup';</script>";
        // console.log(_errAlert);
        res.send(_errAlert);
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { email, password: hashedPassword };
    var user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    let sql = "INSERT INTO users (email , password ,regip) values ('"+email+"','"+hashedPassword+"','"+user_ip+"') ";
    try{
        await saveDB(sql);
        console.log(email + 'signup 새로운 사용자가 추가되었습니다.');
        await fn_makeAddress(email);
        
        req.session.email = email; // 사용자 정보를 세션에 추가하여 로그인 상태로 설정
        let _userIdx = await fn_getIdFromEmail(email);
        req.session.userIdx = _userIdx;
        let _memo1 = "SELF 가입";
        await fn_setPontLog(_userIdx, 100, _memo1, user_ip);
        // 최초 가입시 point 를 주고 log 를 -두시간 전으로 쌓음
        let sql2 = "INSERT INTO mininglog (userIdx, aah_balance, regdate, regip, memo) VALUES ('"+_userIdx+"','"+_regMiningQty+"', DATE_SUB(NOW(), INTERVAL 7205 SECOND),'"+user_ip+"','"+_memo1+"')";
        try{ await saveDB(sql2); }catch(e){ }

        res.redirect('/');
    }catch(e){
        console.log(sql);
    }
});

app.get('/invite', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
        return;// res.status(401).send('로그인이 필요합니다.');
    }

    const _email = req.session.email;
    const _userIdx = req.session.userIdx;
    const inviteCode = shortid.generate();
    // let ref_id = await fn_getIdFromEmail(fid);
    const inviteLink = `${process.env.FRONTEND_URL}/join?code=${inviteCode}&fid=${_userIdx}`;
    // res.send(inviteLink);

    res.render('invite', { inviteLink:inviteLink, email:_email, userIdx:_userIdx });
});

// https://tel3.c4ei.net/join?code=5FiuDQx5b&fid=1
app.get('/join', (req, res) => {
    const { code, fid, resend } = req.query;
    let err_msg="";
    if (!code) {
        // return res.status(400).send('초대 코드가 필요합니다.');
        err_msg= err_msg +"초대 코드가 필요합니다.";
        res.render('error', { err_msg:err_msg});
        return;
    }
    let _resend = resend;
    if(_resend==undefined){
        _resend ="N";
    }
    res.render('join', { code , fid:fid , _resend:_resend });
});

app.post('/joinok', async (req, res) => {
    let { code, email, password, fid } = req.body;
    let err_msg="";
    if (!code || !email || !password || !fid) {
        // return res.status(400).send('코드, EMAIL, 비밀번호가 필요합니다.');
        err_msg= err_msg +"코드, EMAIL, 비밀번호가 필요합니다.";
        res.render('error', { err_msg:err_msg});
        return;
    }
    code = jsfnRepSQLinj(code);
    email = jsfnRepSQLinj(email);
    password = jsfnRepSQLinj(password);
    fid = jsfnRepSQLinj(fid);

    // let reg_idx = await fn_getIdFromEmail(email);
    // if(reg_idx>0){
    //     //이미 가입된 email 입니다.
    //     let resend_link = `${process.env.FRONTEND_URL}/join?code=${code}&fid=${fid}&resend=Y`;
    //     res.redirect(resend_link);
    //     return;
    // }
    let resend_link = `/join?code=${code}&fid=${fid}`;
    let sql0 = "SELECT count(userIdx) cnt FROM users WHERE email='"+email+"'" ;
    let result0 = await loadDB(sql0);
    let _cnt = result0[0].cnt;
    if(_cnt>0){
        let _errAlert = "<script>alert('이미 존재 하는 EMAIL 입니다.');document.location.href='"+resend_link+"';</script>";
        res.send(_errAlert);
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    var user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    let sql = "INSERT INTO users (email, password, aah_balance, point, regip, reffer_id) values ('"+email+"','"+hashedPassword+"','"+_regMiningQty+"','200','"+user_ip+"','"+fid+"') ";
    try{
        await saveDB(sql);

        console.log('joinok '+email +'-['+fid+'] 새로운 사용자가 추가되었습니다.');
        await fn_makeAddress(email);
        let _userIdx = await fn_getIdFromEmail(email);
        req.session.email = email; // 사용자 정보를 세션에 추가하여 로그인 상태로 설정
        req.session.userIdx = _userIdx;
        
        let _memo1 = "추천인 존재로 가입";
        await fn_setPontLog(_userIdx, 200, _memo1, user_ip);
        //추천인 보상
        let sql1 = "update users set last_reg=now(), point=point+100, reffer_cnt=reffer_cnt+1 , aah_balance = CAST(aah_balance AS DECIMAL(22,8)) + CAST('"+_regMiningQty+"' AS DECIMAL(22,8)) where userIdx = '"+fid+"' ";
        try{ await saveDB(sql1); } catch(e){ console.log("추천인 보상 " + sql1); }
        let _memo2 = email +" 의 추천인 가입 ";
        await fn_setPontLog(fid,100,_memo2,user_ip);

        // 최초 가입시 point 를 주고 log 를 -두시간 전으로 쌓음
        let sql2 = "INSERT INTO mininglog (userIdx, aah_balance, regdate, regip, memo) VALUES ('"+_userIdx+"','"+_regMiningQty+"', DATE_SUB(NOW(), INTERVAL 7205 SECOND),'"+user_ip+"','"+_memo1+"')";
        try{ await saveDB(sql2); }catch(e){ }
        
        
        // let sql4 = "INSERT INTO mininglog (userIdx, aah_balance, regdate, regip, memo) VALUES ('"+fid+"','"+_regMiningQty+"', DATE_SUB(NOW(), INTERVAL 7205 SECOND),'"+user_ip+"','"+_memo1+"')";
        // try{ await saveDB(sql4); }catch(e){ }
    } catch(e) {
        console.log(sql);
    }

    res.redirect('/');
});

app.get('/makeparty', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
        return;
        //return res.status(401).send('로그인이 필요합니다.');
    }

    const _email = req.session.email;
    const _userIdx = req.session.userIdx;

    let sql1 = "SELECT count(userIdx) cnt FROM parties WHERE userIdx='"+_userIdx+"'" ;
    let result1 = await loadDB(sql1);
    let _cnt = result1[0].cnt;

    let result2 = "nodata";
    let partyName = "";
    if(_cnt>0){
        let sql2 = "SELECT * FROM parties WHERE userIdx='"+_userIdx+"'";
        result2 = await loadDB(sql2);
        if(result2.length>0){
            partyName= result2[0].partyName;
            // userIdx = result2[0].userIdx;
        }
    }

    res.render('makeparty', { email:_email, userIdx:_userIdx ,partyName:partyName, result2:result2 });
});

app.post('/makepartyok', async (req, res) => {
    let err_msg="";
    const { partyName } = req.body;
    if (!req.session.email || !partyName) {
        res.redirect('/login');
        return;
        // return res.status(400).send('파티 이름과 로그인이 필요합니다.');
    }
    let _partyName = jsfnRepSQLinj(partyName);
    // const email = req.session.email;
    let userIdx = req.session.userIdx;
    var user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;

    let sql1 = "select count(*) cnt from parties where userIdx = '"+userIdx+"'";
    let result1 = await loadDB(sql1);
    let _cnt = result1[0].cnt;
    if(_cnt>0){
        err_msg= err_msg +" 이미 생성한 파티가 있어 더이상 생성 불가능 합니다.";
        res.render('error', { err_msg:err_msg});
        return;
    }else{
        let sql1_1 = "delete from party_member where user_idx='"+userIdx+"'";
        await saveDB(sql1_1);
    }

    let sql2 = "insert into parties (partyName, userIdx, regip) values ('"+_partyName+"','"+userIdx+"','"+user_ip+"')";
    await saveDB(sql2);
    
    let sql3 = "";
    sql3 = sql3 + "select idx FROM parties where partyName='"+_partyName+"'";
    let result3 = await loadDB(sql3);
    let party_idx = 0;
    if(result3.length>0){
        party_idx= result3[0].idx;
    }
    if(party_idx!=0){
        let sql4 = "";
        sql4 = sql4 + "insert into party_member (party_idx, user_idx, regip ) VALUES ('"+party_idx+"','"+userIdx+"','"+user_ip+"')";
        await saveDB(sql4);
    }

    res.redirect('/');
});

// 파티 목록 및 페이징
app.get('/parties', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
        return;
    }
    let userIdx = req.session.userIdx;

    const resultsPerPage = 10;
    const page = req.query.page || 1;
    const offset = (page - 1) * resultsPerPage;
  
    let sql1 = "";
    sql1 = sql1 + " SELECT a.idx, a.partyName, COUNT(b.idx) AS party_mem_cnt ";
    sql1 = sql1 + " FROM parties a , party_member b  "
    sql1 = sql1 + " WHERE a.idx = b.party_idx "
    // 검색 기능 추가
    const searchTerm = req.query.search;
    let searchQuery = '';
    if (searchTerm) {
        sql1 += ` and a.partyName LIKE '%${searchTerm}%'`;
        searchQuery = `&search=${searchTerm}`;
    }
    sql1 = sql1 + " GROUP BY a.idx, a.partyName     ";
    sql1 += ` LIMIT ${offset}, ${resultsPerPage}`;

    let result1 = await loadDB(sql1).catch(err => { console.error(err); });
  
    // 전체 파티 수 계산
    let sql2="SELECT COUNT(*) AS count FROM parties"
    let result2 = await loadDB(sql2);
    const totalCount = result2[0].count;
    const pageCount = Math.ceil(totalCount / resultsPerPage);

    let myP_idx = await jsfn_getMyParty_idx(userIdx);
    let myP_name = await jsfn_getPartyName(myP_idx);

    res.render('parties', { result1: result1, pageCount, searchQuery , myP_idx:myP_idx, myP_name:myP_name});
});

app.post('/partymemberjoinok', async (req, res) => {
    let err_msg = "";
    // 클라이언트로부터 받은 데이터를 req.body를 통해 가져옵니다.
    const partyIndex = req.body.partyIndex;
    let userIdx = req.session.userIdx;
    var user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;

    let sql1 = "";
    sql1 = sql1 + "select count(idx) p_admin_cnt FROM parties where userIdx='"+userIdx+"'";
    let result1 = await loadDB(sql1);
    let _p_admin_cnt= result1[0].p_admin_cnt;
    if(_p_admin_cnt>0){
        err_msg = err_msg + "파티장은 파티 삭제 후 파티에 가입 가능 합니다.";
        res.render('error', { err_msg:err_msg});
        return;
    }

    let sql3 = "";
    sql3 = sql3 + "select count(party_idx) partyCnt FROM party_member where user_idx='"+userIdx+"'";
    let result3 = await loadDB(sql3);
    let partyCnt = 0;
    if(result3.length>0){
        partyCnt= result3[0].partyCnt;
    }
    if(partyCnt==0){
        let sql4 = "";
        sql4 = sql4 + "insert into party_member (party_idx, user_idx, regip ) VALUES ('"+partyIndex+"','"+userIdx+"','"+user_ip+"')";
        await saveDB(sql4);
    }else{
        err_msg = err_msg + "이미 파티에 가입 되어있습니다.";
        res.render('error', { err_msg:err_msg});
        return;
    }

    res.redirect('/');
});

// 적립 요청 처리
// 데이터베이스 시뮬레이션용 변수
// let accumulatedPoints = 0;
app.post('/accumulate', async (req, res) => {
    let { m_miningQty, m_userIdx , m_email } = req.body;
    m_miningQty = jsfnRepSQLinj(m_miningQty);
    m_userIdx = jsfnRepSQLinj(m_userIdx);
    m_email = jsfnRepSQLinj(m_email);
    let err_msg="";
    let chk_email = req.session.email;
    let chk_userIdx = req.session.userIdx;
    if(m_userIdx!=chk_userIdx || m_email!=chk_email){
        err_msg= err_msg +" 세션에 문제가있습니다. 다시 로그인 해 주세요.";
        res.render('error', { err_msg:err_msg});
        return;
    }
    var user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    let _err = ""
    let sql1 = "SELECT COUNT(midx) cnt FROM mininglog WHERE useridx='"+m_userIdx+"'" ;
    let result1 = await loadDB(sql1);
    let _cnt = result1[0].cnt;
    let _ing_sec = 0;
    if(_cnt>0){
        let sql2 = "SELECT TIMESTAMPDIFF(second, regdate, NOW()) AS sec FROM mininglog WHERE useridx='"+m_userIdx+"' AND midx=(SELECT MAX(midx) FROM mininglog WHERE useridx='"+m_userIdx+"')";
        let result2 = await loadDB(sql2);
        _ing_sec = result2[0].sec;
    }
    if(_ing_sec>86400){_ing_sec = 86400;}

    if(m_miningQty>1.5){
        _err = _err + email +" 님 한번에 1.5 CEIK 초과 채굴은 불가능 합니다.";
        let _errAlert = "<script>alert('한번에 1.5 CEIK 초과 채굴은 불가능 합니다. (It is not possible to mine more than 1.5 CEIK at one time.)');document.location.href='/mining';</script>";
        res.send(_errAlert);
        return;
    }
    if(_cnt==0||_ing_sec>7200){
        let sql2 = "UPDATE users set aah_balance = CAST(aah_balance AS DECIMAL(22,8)) + CAST('"+m_miningQty+"' AS DECIMAL(22,8)), last_reg=now(), last_ip='"+user_ip+"' WHERE userIdx = '"+m_userIdx+"'";
        try{
            await saveDB(sql2);
            console.log('적립된 포인트: %s / %s / %s', m_miningQty , m_userIdx , m_email);
            let _memo2 = m_email +" WEB MINING ";
            await fn_setMiningLog(m_userIdx,m_miningQty,_memo2,user_ip);

            let _errAlert = "<script>alert(' "+m_miningQty+" 포인트 적립 - "+m_email+"');document.location.href='/mining';</script>";
            res.send(_errAlert);
            return;
        } catch(e) {
            console.log(sql2);
        }
    }else{
        _err = _err + m_email +" : 2 hours not passed";
        let _errAlert = "<script>alert('2시간 마다 가능 합니다. (is possible every 2 hours.)');document.location.href='/mining';</script>";
        res.send(_errAlert);
        return;
    }

    // res.sendStatus(200);
    res.redirect('/');
    return;
});

app.post('/sendAAH', async (req, res) => {
    let { f_aah_balance , f_userIdx , f_email } = req.body;
    f_aah_balance = jsfnRepSQLinj(f_aah_balance);
    f_userIdx = jsfnRepSQLinj(f_userIdx);
    f_email = jsfnRepSQLinj(f_email);
    let err_msg="";
    let chk_email = req.session.email;
    let chk_userIdx = req.session.userIdx;
    if(f_userIdx!=chk_userIdx || f_email!=chk_email){
        let _errAlert = "<script>alert('세션에 문제가있습니다. 다시 로그인 해 주세요.');document.location.href='/login';</script>";
        res.send(_errAlert);
        return;
    }

    var user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    let sql = "SELECT userIdx, pub_key, aah_balance, aah_real_balance, reqAAH_ingYN, IFNULL(user_add_addr, '') as user_add_addr FROM users WHERE userIdx='"+chk_userIdx+"'";
    let result = await loadDB(sql);
    // console.log(result.length +" : result.length" + JSON.stringify(result[0]) );
    let _aah_balance = f_aah_balance; // from DB value
    let _reqAAH_ingYN = "N";
    let _user_add_addr="";
    if(result.length>0){
        _aah_balance = result[0].aah_balance;
        _pub_key     = result[0].pub_key;
        _reqAAH_ingYN = result[0].reqAAH_ingYN;
        _user_add_addr = result[0].user_add_addr;
    }

    if(_aah_balance<30){
        let _errAlert = "<script>alert('최소 전송 수량은 30 CEIK 부터 입니다. 현재 CEIK "+_aah_balance+" ');document.location.href='/mining';</script>";
        res.send(_errAlert);
        return;
    }
    let sql0 = "SELECT count(userIdx) AS cnt FROM sendlog WHERE userIdx ='"+chk_userIdx+"' and memo='CEIK_MINING' and regdate > DATE_ADD(now(), INTERVAL -7 HOUR)";
    let result0 = await loadDB(sql0);
    let mining_Cnt = result0[0].cnt;
    // console.log(mining_Cnt+":mining_Cnt");
    if(mining_Cnt==0){
        if (_reqAAH_ingYN=='N'){
            if(_user_add_addr==""){
                err_msg = err_msg + fn_sendMining(process.env.AAH_BANK_ADDRESS, _pub_key, _aah_balance, chk_userIdx, user_ip);
            }else{
                err_msg = err_msg + fn_sendMining(process.env.AAH_BANK_ADDRESS, _user_add_addr, _aah_balance, chk_userIdx, user_ip);
            }
            let _errAlert = "<script>alert('"+_aah_balance+" CEIK 전송이 완료되었습니다.');document.location.href='/mining';</script>";
            res.send(_errAlert);
            // console.log(_errAlert);
            return;
        }else{
            let _errAlert = "<script>alert('이미 처리중입니다. (It is already being processed.)');document.location.href='/mining';</script>";
            res.send(_errAlert);
            // console.log(_errAlert);
            return;
        }
        // res.sendStatus(200);
    }else{
        let _errAlert = "<script>alert('전송은 8시간 마다 가능 합니다. (Transmission is possible every 8 hours.)');document.location.href='/mining';</script>";
        res.send(_errAlert);
        // console.log(_errAlert);
        return;
    }
    // console.log(err_msg);

    res.redirect('/');
    return;
});

app.get('/add_address', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
        return;
        //return res.status(401).send('로그인이 필요합니다.');
    }

    const _email = req.session.email;
    const _userIdx = req.session.userIdx;

    let sql1 = "SELECT user_add_addr FROM users WHERE userIdx='"+_userIdx+"'" ;
    let result1 = await loadDB(sql1);
    let _user_add_addr = result1[0].user_add_addr;

    res.render('add_address', { email:_email, userIdx:_userIdx ,user_add_addr:_user_add_addr });
});

app.post('/add_addrok', async (req, res) => {
    let err_msg="";
    const { user_add_addr } = req.body;
    if (!req.session.email || !user_add_addr) {
        res.redirect('/login');
        return;
    }

    let sql = "SELECT count(user_add_addr) as uCnt FROM users WHERE user_add_addr='"+user_add_addr+"'";
    let result = await loadDB(sql);
    _uCnt = result[0].uCnt;
    if(_uCnt>0){
        let _errAlert = "<script>alert('다른 계정에 이미 등록된 주소 입니다.');document.location.href='/add_address';</script>";
        res.send(_errAlert);
        return;
    }

    let _user_add_addr = jsfnRepSQLinj(user_add_addr);
    _user_add_addr = await web3.utils.toChecksumAddress(_user_add_addr);
    // const email = req.session.email;
    let userIdx = req.session.userIdx;
    var user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;

    let sql2 = "update users set user_add_addr='"+_user_add_addr+"', exp=exp+10, last_ip='"+user_ip+"',last_reg=now() where userIdx='"+userIdx+"'";
    await saveDB(sql2);

    res.redirect('/');
});


// 경험치 추가 및 레벨업 로직 업데이트
// app.post('/addExp', async (req, res) => {
//     const userIdx = req.body.userIdx;
//     const expToAdd = req.body.exp;

//     let getUserQuery = `SELECT level, exp FROM users WHERE userIdx = ${userIdx}`;
//     try {
//         let user = await loadDB(getUserQuery);

//         let newExp = user.exp + expToAdd;
//         let newLevel = user.level;

//         while (newExp >= newLevel * 1000) { // 예시: 레벨당 1000 경험치 필요
//             newExp -= newLevel * 1000;
//             newLevel += 1;
//         }

//         let updateUserQuery = `UPDATE users SET exp = ${newExp}, level = ${newLevel} WHERE userIdx = ${userIdx}`;
//         await saveDB(updateUserQuery);
        
//         // res.send(`User ${userIdx} now has ${newExp} EXP and is level ${newLevel}`);
//         let _errAlert = "<script>alert('User "+userIdx+" now has "+newExp+" EXP and is level "+newLevel+" ');document.location.href='/';</script>";
//         res.send(_errAlert);
//         return;

//     } catch (err) {
//         console.error(err);
//         // res.status(500).send('Error updating user experience');
//         let _errAlert = "<script>alert('Error updating user experience : "+err+"');document.location.href='/';</script>";
//         res.send(_errAlert);
//     }
//     res.redirect('/');
// });

// 부스터 활성화 로직
app.post('/activateBooster', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
        return;
    }
    const userIdx = req.body.b_userIdx;
    const boosterId = req.body.b_boosterId;
    if (req.session.userIdx!=userIdx) {
        let _errAlert = "<script>alert('로그인한 사용자와 요청자의 id 가 달라서 처리가 불가능 합니다.');document.location.href='/';</script>";
        res.send(_errAlert);
        return;
    }

    let sql0 = `SELECT id,userIdx,bname,multiplier,duration,active,useYN,processYN,memo FROM boosters WHERE id = ${boosterId}`;
    let result0 = await loadDB(sql0);
    let _bname = "";
    let _active = false;
    let _useYN = "N";
    let _processYN = "N";
    if(result0.length>0){
        _bname      = result0[0].bname;
        _active     = result0[0].active;
        _useYN      = result0[0]._useYN;
        _processYN  = result0[0].processYN;
    }else{
        let _errAlert = "<script>alert('Booster id : "+boosterId +" - 해당하는 Boost 가 없습니다.');document.location.href='/';</script>";
        res.send(_errAlert);
        return;
    }
    if(_useYN=="Y"||_processYN=="Y"||_active){
        let _errAlert = "<script>alert('Booster id : "+boosterId +" - 이미 사용된 boost 입니다.');document.location.href='/';</script>";
        res.send(_errAlert);
        return;
    }
    
    var user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    // ,processYN='N' Default
    let activateBoosterQuery = `UPDATE boosters SET active=TRUE, usedate=now(), useip='${user_ip}', useYN='Y' WHERE id=${boosterId} AND userIdx=${userIdx}`;
    try {
        await saveDB(activateBoosterQuery);

        let _errAlert = "<script>alert('Booster "+boosterId +" activated for user "+userIdx +"');document.location.href='/';</script>";
        res.send(_errAlert);
        return;
    } catch (err) {
        console.error(err);
        let _errAlert = "<script>alert('Error activating booster : "+err+"');document.location.href='/';</script>";
        res.send(_errAlert);
        return;
    }
    res.redirect('/');
});

//2.1 부스터 상품 삽입 API
app.post('/addBooster', async (req, res) => {
    const { userIdx, bname, multiplier, duration } = req.body;

    let insertBoosterQuery = `INSERT INTO boosters (userIdx, bname, multiplier, duration) VALUES (${userIdx}, '${bname}', ${multiplier}, ${duration})`;
    try {
        await saveDB(insertBoosterQuery);
        let _errAlert = "<script>alert('Booster added successfully!');document.location.href='/manageBoosters';</script>";
        res.send(_errAlert);
        return;
    } catch (err) {
        console.error(err);
        let _errAlert = "<script>alert('Error adding booster: " + err + "');document.location.href='/manageBoosters';</script>";
        res.send(_errAlert);
        return;
    }
});

//2.2 부스터 상품 관리 페이지
app.get('/manageBoosters', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
    }
    let _email = req.session.email;
    let _userIdx = req.session.userIdx;
    if(_userIdx!=40){
        let _errAlert = "<script>alert('only use Admin');document.location.href='/';</script>";
        res.send(_errAlert);
        return;
    }
    // const userIdx = req.query.userIdx;
    let getBoostersQuery = `SELECT * FROM boosters WHERE userIdx = ${_userIdx}`;
    try {
        let boosters = await loadDB(getBoostersQuery);
        res.render('manageBoosters', { userIdx:_userIdx, boosters });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading boosters management page');
    }
});

// ######################### roulette start #########################
const ITEM_PROBABILITIES = {
    'Nothing': 0.4,
    'Spin Again': 0.3,
    '0.1 CEIK': 0.15,
    '0.5 CEIK': 0.1,
    '1 CEIK': 0.04,
    '10 CEIK': 0.01
};

function getRandomItem(probabilities) {
    const random = Math.random();
    let cumulativeProbability = 0.0;

    for (const [item, probability] of Object.entries(probabilities)) {
        cumulativeProbability += probability;
        if (random < cumulativeProbability) {
            return item;
        }
    }
    return 'Nothing';
}

app.post('/spinRoulette', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
        return;
    }

    const userIdx = req.session.userIdx;
    const freeSpin = req.body.freeSpin === true;

    let getUserQuery = `SELECT point, aah_balance, last_spin, last_result FROM users WHERE userIdx = ${userIdx}`;
    try {
        let user = (await loadDB(getUserQuery))[0];
        let now = new Date();
        let lastSpinDate = new Date(user.last_spin);
        let today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (!freeSpin && user.point < 10) {
            res.status(400).json({ error: 'Not enough points' });
            return;
        }

        if (freeSpin && lastSpinDate >= today) {
            res.status(400).json({ error: 'You have already used your free spin today' });
            return;
        }

        // Adjusted probabilities based on win counts
        let winCounts = await loadDB('SELECT item, win_count, last_reset FROM item_wins');
        let winCountMap = {};
        winCounts.forEach(row => {
            winCountMap[row.item] = {
                win_count: row.win_count,
                last_reset: new Date(row.last_reset)
            };
        });

        let probabilities = { ...ITEM_PROBABILITIES };
        let totalSpins = winCounts.reduce((acc, row) => acc + row.win_count, 0);

        const updateProbability = (item, maxWins, resetHours) => {
            if (winCountMap[item]) {
                let timeSinceLastReset = (now - winCountMap[item].last_reset) / (1000 * 60 * 60); // hours
                if (timeSinceLastReset >= resetHours) {
                    saveDB(`UPDATE item_wins SET win_count = 0, last_reset = NOW() WHERE item = '${item}'`);
                    winCountMap[item].win_count = 0;
                    winCountMap[item].last_reset = now;
                }
                if (winCountMap[item].win_count >= maxWins) {
                    probabilities[item] = 0.0;
                }
            }
        };

        updateProbability('10 CEIK', 1, 24);
        updateProbability('1 CEIK', 4, 6);
        updateProbability('0.5 CEIK', 12, 2);

        if (user.last_result === 'Spin Again') {
            probabilities['Spin Again'] = 0.0;
        }

        let cumulativeProbability = 0;
        let cumulativeProbabilities = {};
        for (let item in probabilities) {
            cumulativeProbability += probabilities[item];
            cumulativeProbabilities[item] = cumulativeProbability;
        }

        let wonItem = getRandomItem(cumulativeProbabilities);

        let updateQuery = '';
        if (wonItem !== 'Nothing') {
            let ceikAmount = 0;
            switch (wonItem) {
                case '0.1 CEIK': ceikAmount = 0.1; break;
                case '0.5 CEIK': ceikAmount = 0.5; break;
                case '1 CEIK': ceikAmount = 1; break;
                case '10 CEIK': ceikAmount = 10; break;
            }

            if (ceikAmount > 0) {
                updateQuery = `UPDATE users SET aah_balance = ROUND(aah_balance + ${ceikAmount}, 8) WHERE userIdx = ${userIdx}`;
                await saveDB(updateQuery);
            }

            let itemWinCountUpdateQuery = `INSERT INTO item_wins (item, win_count, last_reset)
                VALUES ('${wonItem}', 1, NOW())
                ON DUPLICATE KEY UPDATE win_count = win_count + 1`;
            await saveDB(itemWinCountUpdateQuery);
        }

        // 포인트 차감 로직을 조정하여 'Spin Again'인 경우에는 차감되지 않도록 함
        if (!freeSpin && wonItem !== 'Spin Again') {
            updateQuery = `UPDATE users SET point = point - 10 WHERE userIdx = ${userIdx}`;
            await saveDB(updateQuery);
        }

        if (freeSpin) {
            updateQuery = `UPDATE users SET last_spin = NOW() WHERE userIdx = ${userIdx}`;
            await saveDB(updateQuery);
        }

        let updateLastResultQuery = `UPDATE users SET last_result = '${wonItem}' WHERE userIdx = ${userIdx}`;
        await saveDB(updateLastResultQuery);

        let logQuery = `INSERT INTO spin_logs (userIdx, item) VALUES (${userIdx}, '${wonItem}')`;
        await saveDB(logQuery);

        console.log(getCurTimestamp() + " / wonItem : " + wonItem + " ▶ " + req.session.email);
        res.json({ result: wonItem });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error spinning roulette' });
    }
});

// GET /roulette
app.get('/roulette', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
        return;
    }

    const userIdx = req.session.userIdx;
    let getUserQuery = `SELECT userIdx, email, point, aah_balance, last_spin, last_result FROM users WHERE userIdx = ${userIdx}`;

    try {
        let user = (await loadDB(getUserQuery))[0];
        let now = new Date();
        let lastSpinDate = new Date(user.last_spin);
        let today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        user.canSpin = lastSpinDate < today; // 사용자가 오늘 무료 스핀을 사용할 수 있는지 여부를 확인
        res.render('roulette', { user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading roulette page');
    }
});

// ######################### roulette end #########################

// ######################### ladder start #########################
async function jsfn_create_lad_game(){
    // let currentGame = await loadDB("SELECT count(game_id) cnt FROM lad_game WHERE game_time >= NOW() - INTERVAL 6 MINUTE ORDER BY game_time DESC LIMIT 1");
    let currentGame = await loadDB("SELECT game_id, game_time, TIMESTAMPDIFF(SECOND, regdate, NOW()) AS diffSec FROM lad_game WHERE game_id = (SELECT MAX(game_id) FROM lad_game)");
    if(currentGame[0].diffSec>360){
        // const newGameTime = new Date(Date.now() + 5 * 60 * 1000); // 5분 후 종료되는 새로운 게임
        const str_sql = "INSERT INTO lad_game (game_time) SELECT DATE_ADD(NOW(), INTERVAL 6 MINUTE) AS game_time FROM DUAL ";
        try{
            await saveDB(str_sql);
        }catch(e){
            console.log("jsfn_create_lad_game\n"+str_sql);
        }
        let req=null;
        jsfn_ladder_save(req , currentGame[0].game_id); // 이전게임을 정산한다
        console.log("#### NEW lad_game create - "+getCurTimestamp() +"####");
    }else{
        console.log(currentGame[0].diffSec+"초로 진행 중인 게임이 있어 게임 생성 불가능 - jsfn_create_lad_game" );
    }
}

jsfn_create_lad_game(); // Server start!!!!

// 6분마다 lad_game
cron.schedule('*/6 * * * *', async () => {
    console.log('6분마다 lad_game create - '+getCurTimestamp());
    try {
        jsfn_create_lad_game();
    } catch (error) {
        console.error('jsfn_create_lad_game Error querying database:', error);
    }
});

// 데이터를 반환하는 엔드포인트 추가
app.get('/api/graph-data/:game_id', async (req, res) => {
    const gameId = req.params.game_id;
    
    const data = await getDataForGame(gameId); // 예: getDataForGame 함수가 gameId에 따른 데이터를 반환
    res.json(data);
});

// gameId에 따른 데이터를 반환하는 예시 함수
async function getDataForGame(gameId) {
    let highPercent = 50;
    let lowPercent = 50;

    const bets = await loadDB("SELECT bet_choice, COUNT(*) AS count FROM lad_bet WHERE game_id='"+gameId+"' GROUP BY bet_choice");
    const totalBets = bets.reduce((acc, bet) => acc + bet.count, 0);
    if (totalBets > 0) {
        highPercent = (bets.find(bet => bet.bet_choice === 'high')?.count || 0) / totalBets * 100;  // 해당 요소가 찾아지면 그 요소의 count 값을 가져옵니다
        // 이 코드는 bets 배열에서 bet_choice가 'high'인 첫 번째 요소를 찾습니다. 이때 bet은 배열의 각 요소를 의미합니다. 이 조건에 맞는 요소가 없으면 undefined를 반환합니다.
        // 그런 다음 ?. 옵셔널 체이닝 연산자를 사용하여, count 속성이 있는 경우에만 해당 값을 가져옵니다. 이것은 undefined 또는 null일 때 count 값을 가져오려고 할 때 발생하는 TypeError를 방지합니다.
        // 그리고 만약 찾은 요소의 count 값이 없다면(즉, undefined이거나 null이면), 대신 0을 사용합니다. 이는 안전한 기본값으로 설정되어, 에러를 방지합니다.
        // 마지막으로, totalBets로 나누어 비율을 구하고 100을 곱하여 퍼센트 값으로 변환합니다. 이 값은 highPercent 변수에 할당됩니다.
        // 따라서 위 코드는 bets 배열에서 'high' 베팅의 비율을 계산하고, 이를 퍼센트 값으로 변환하여 highPercent에 할당하는 것입니다.

        lowPercent = (bets.find(bet => bet.bet_choice === 'low')?.count || 0) / totalBets * 100;
    }
    /*
    const bets = await loadDB(` SELECT bet_choice, SUM(bet_amount) AS total_amount FROM lad_bet WHERE game_id='${gameId}' GROUP BY bet_choice `);

    // 모든 베팅 금액의 총합을 계산
    const totalBets = bets.reduce((acc, bet) => acc + bet.total_amount, 0);

    if (totalBets > 0) {
        // 'high'와 'low'에 대한 베팅 금액을 찾고 비율을 계산
        highPercent = (bets.find(bet => bet.bet_choice === 'high')?.total_amount || 0) / totalBets * 100;
        lowPercent = (bets.find(bet => bet.bet_choice === 'low')?.total_amount || 0) / totalBets * 100;
    } else {
        highPercent = 50;
        lowPercent = 50;
    }
    */
    return {
        high: highPercent,  // 예시 데이터
        low: lowPercent
    };
}


app.get('/ladder', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
        return;
    }
    const userIdx = req.session.userIdx; // from session 

    // 현재 게임을 찾는다.
    // let currentGame = await loadDB("SELECT game_id, game_time FROM lad_game WHERE game_time >= NOW() - INTERVAL 6 MINUTE ORDER BY game_time DESC LIMIT 1");
    let currentGame = await loadDB("SELECT game_id, game_time, TIMESTAMPDIFF(SECOND, regdate, NOW()) AS diffSec FROM lad_game WHERE game_id = (SELECT MAX(game_id) FROM lad_game)");
    let _cur_game_id = currentGame[0].game_id;
    let previousGameResult = null;
    let showPreviousResult = false;
    if(currentGame[0].diffSec>360){
        jsfn_create_lad_game();
        let _errAlert = "<script>alert('진행 되는 게임이 없어 새 게임이 추가 되었습니다.');document.location.href='/ladder';</script>";
        // console.log(_errAlert);
        res.send(_errAlert);
        return;
    }

    const currentTime = new Date();
    const endTime = new Date(currentGame[0].game_time);
    const timeDifference = (currentTime - endTime) / 1000; // 시간 차이를 초 단위로 계산
    // console.log( timeDifference + " : timeDifference / " + endTime +" : endTime 1238 Line");
    if (timeDifference >= 0 && timeDifference <= 60) {
        showPreviousResult = true;
        previousGameResult = await loadDB("SELECT result, bet_amount, win_amount FROM lad_bet WHERE game_id ='"+_cur_game_id+"' ");
    }

    let highPercent = 50;
    let lowPercent = 50;
    let gameResult = null;
    let userBets = [];
    let userResult = null;
    let userWinningRate = 0;
    let userCEIKGain = 0;
    let userPercentGain = 0;

    let isPreparing = false;
    const remainingTime = endTime - new Date();
    isPreparing = remainingTime > 5 * 60 * 1000;

    if (!isPreparing && !showPreviousResult) {
        try {
            const bets = await loadDB("SELECT bet_choice, COUNT(*) AS count FROM lad_bet WHERE game_id='"+_cur_game_id+"' GROUP BY bet_choice");
            const totalBets = bets.reduce((acc, bet) => acc + bet.count, 0);
            if (totalBets > 0) {
                highPercent = (bets.find(bet => bet.bet_choice === 'high')?.count || 0) / totalBets * 100;
                lowPercent = (bets.find(bet => bet.bet_choice === 'low')?.count || 0) / totalBets * 100;
            }

            const userBetResult = await loadDB("SELECT result, amount, win_amount FROM lad_bet WHERE game_id='"+_cur_game_id+"' AND userIdx='"+userIdx+"'");
            if (userBetResult.length > 0) {
                userResult = userBetResult[0].result;
                userCEIKGain = userBetResult[0].win_amount;
                userPercentGain = userResult ? (userCEIKGain / userBetResult[0].amount) * 100 : -100;
            }
        } catch (error) {
            console.error("Error executing query: ", error.sql);
            console.error("Error message: ", error.message);
        }
    }

    let _aah_balance= await jsfn_getDB_AAH(userIdx);
    userBets = await loadDB("SELECT game_id, bet_choice, bet_amount, regdate , DATE_FORMAT(regdate, '%Y-%m-%d %H:%i:%s') AS YYMMDD ,result,win_amount FROM lad_bet WHERE userIdx='"+userIdx+"'  ORDER BY regdate DESC LIMIT 10 ");

    res.render('ladder', {
        userIdx,
        "cur_game_id":_cur_game_id,
        "aah_balance":_aah_balance,
        endTime: endTime.toISOString(),
        isPreparing,
        highPercent,
        lowPercent,
        gameResult,
        userResult,
        userWinningRate,
        userCEIKGain,
        userPercentGain,
        userBets,
        showPreviousResult,
        previousGameResult
    });
});

async function jsfn_getDB_AAH(userIdx){
    let _aah_balance="0";
    let sql = "SELECT aah_balance FROM users WHERE userIdx='"+userIdx+"'";
    let result = await loadDB(sql);
    if(result.length>0){
        _aah_balance = result[0].aah_balance;
    }
    return _aah_balance;
}

app.post('/ladder/bet', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
        return;
    }
    let s_userIdx = req.session.userIdx;  // 
    const { userIdx, bet_amount, bet_choice, game_id } = req.body;
    if (!bet_amount || !bet_choice || !game_id) {
        res.redirect('/ladder');
        return;
    }
    const currentGameDB = await loadDB("SELECT game_id FROM lad_game WHERE game_time >= NOW() - INTERVAL 6 MINUTE ORDER BY game_time DESC LIMIT 1");
    if (currentGameDB.length === 0) {
        res.redirect('/ladder');
        return;
    }
    let _cur_game_id = currentGameDB[0].game_id;
    if(game_id!=_cur_game_id){
        let _errAlert = "<script>alert('게임 회차가 다릅니다.\n이미 다른게임이 진행 중입니다.');document.location.href='/ladder';</script>";
        res.send(_errAlert);
        return;
    }
    let _ceik_qty = await jsfn_getDB_AAH(s_userIdx);
    if (parseFloat(_ceik_qty) < bet_amount) {
        let _errAlert = "<script>alert('베팅할 수있는 CEIK 가 적습니다.');document.location.href='/ladder';</script>";
        res.send(_errAlert);
        return;
    }
    
    let user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    await saveDB("INSERT INTO lad_bet (userIdx, game_id, bet_amount, bet_choice) VALUES ('"+s_userIdx+"', '"+_cur_game_id+"', '"+bet_amount+"', '"+bet_choice+"')");
    await saveDB("UPDATE users SET aah_balance = CAST(aah_balance AS DECIMAL(22,8)) - CAST('"+bet_amount+"' AS DECIMAL(22,8)) WHERE userIdx = '"+s_userIdx+"'");
    const _memo = `사다리 ${bet_amount} 베팅`;
    const sql2 = `INSERT INTO mininglog (userIdx, aah_balance, regdate, regip, memo) VALUES ('${s_userIdx}', '${bet_amount}', NOW(), '${user_ip}', '${_memo}')`;
    res.redirect('/ladder');
});

app.get('/ladderend/:game_id', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
        return;
    }
    const game_id = req.params.game_id;
    // console.log("#################### /ladderend game_id:"+game_id+"####################");

    jsfn_ladder_save(req,game_id);
    res.redirect('/ladder');
});

async function jsfn_ladder_save(req, game_id){
    // console.log("#################### Line 1396 jsfn_ladder_save ####################" + getCurTimestamp());
    // 게임 ID 확인 및 사용자 IP 가져오기:
    if(game_id==""){ return; }
    var user_ip = "";
    try{ 
        user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    }catch(e){
        // console.log("Line 1415 - jsfn_ladder_save : " + e);
    }
    console.log("#################### Line 1404 jsfn_ladder_save #################### game_id : " + game_id + " / " + getCurTimestamp());
    // const game_id = previousGame[0].game_id;
    // 게임 결과 계산
    const bets = await loadDB("SELECT bet_choice, SUM(bet_amount) AS total FROM lad_bet WHERE game_id='"+game_id+"' GROUP BY bet_choice ");
    let result = 'high';
    if (bets.length == 2 && bets[1].total > bets[0].total) {
        result = 'low';
    }
    // console.log("Line 1410 - jsfn_ladder_save : result - " + result);
    await saveDB("UPDATE lad_game SET result = '"+result+"' WHERE game_id='"+game_id+"'");
    
    // 패배자의 베팅 결과 업데이트 losingBets
    await saveDB("UPDATE lad_bet SET result='"+result+"', amount='0.00', win_amount='0.00', sendYN='Y' WHERE game_id='"+game_id+"' AND bet_choice !='"+result+"'");

    // 승리자 및 패배자 베팅 정보 조회
    let sql_sel1 = " SELECT userIdx, bet_amount FROM lad_bet WHERE game_id='"+game_id+"' AND bet_choice='"+result+"'";
    const winningBets = await loadDB(sql_sel1);
    // console.log(sql_sel1+" : sql_sel1");
    let sql_sel2 = " SELECT SUM(bet_amount) AS total FROM lad_bet WHERE game_id='"+game_id+"' AND bet_choice != '"+result+"' ";
    const losingBets = await loadDB(sql_sel2);
    // 승리자 배당금 계산 및 업데이트
    if (winningBets.length > 0 && losingBets.length > 0) {
        const totalLosingAmount = losingBets[0].total;
        const fee = totalLosingAmount * 0.10;
        const distributionAmount = totalLosingAmount - fee;
        const totalWinningAmount = winningBets.reduce((sum, bet) => sum + parseFloat(bet.bet_amount), 0);
    
        for (let bet of winningBets) {
            let sql_chk1 = "SELECT sendYN FROM lad_bet WHERE game_id='" + game_id + "' AND bet_choice='" + result + "' and userIdx='" + bet.userIdx + "'";
            const sendYN = await loadDB(sql_chk1);
            if (sendYN[0].sendYN == 'N') {
                let winAmount = 0;
                if (winningBets.length === 1) {
                    // 단독 참여자의 경우, 수수료 10%를 뗀 원금을 반환
                    winAmount = parseFloat(bet.bet_amount) * 0.90;
                } else {
                    // 여러 명이 참여한 경우, 배분된 금액을 계산
                    winAmount = (parseFloat(bet.bet_amount) / totalWinningAmount) * distributionAmount;
                }
                await saveDB("UPDATE users SET aah_balance = CAST(aah_balance AS DECIMAL(22,8)) + CAST('" + winAmount + "' AS DECIMAL(22,8)) WHERE userIdx = '" + bet.userIdx + "'");
    
                const _memo = "사다리[승] " + winAmount;
                const sql2 = "INSERT INTO mininglog (userIdx, aah_balance, regdate, regip, memo) VALUES ('" + bet.userIdx + "', '" + winAmount + "', DATE_SUB(NOW(), INTERVAL 7205 SECOND), '" + user_ip + "', '" + _memo + "')";
                try {
                    await saveDB(sql2);
                } catch (e) {
                    console.error(e);
                }
                let sql_upd = "";
                sql_upd = sql_upd + " UPDATE lad_bet SET result = '" + result + "', amount='0.00', win_amount='" + winAmount + "',sendYN='Y' WHERE game_id='" + game_id + "' AND bet_choice='" + result + "' and userIdx='" + bet.userIdx + "' ";
                console.log(sql_upd + " : sql_upd");
                try {
                    await saveDB(sql_upd);
                } catch (e) {
                    console.error(e);
                }
            } else {
                console.log("이미 처리된 건입니다.");
            }
        }
    }
}

app.get('/ladderList', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
        return;
    }
    const userIdx = req.session.userIdx; // from session 
    const page = parseInt(req.query.page) || 1; // 현재 페이지, 기본값은 1
    const limit = 10; // 한 페이지당 보여줄 항목 수
    const offset = (page - 1) * limit; // 페이지네이션을 위한 오프셋 계산

    // 전체 베팅 수를 계산하여 페이지 수를 계산합니다.
    const totalBetsResult = await loadDB(`SELECT COUNT(*) as count FROM lad_bet WHERE userIdx='${userIdx}'`);
    const totalBetsCount = totalBetsResult[0].count;
    const totalPages = Math.ceil(totalBetsCount / limit);

    // 현재 페이지에 해당하는 베팅 항목을 가져옵니다.
    const userBets = await loadDB(`SELECT game_id, bet_choice, bet_amount, regdate, DATE_FORMAT(regdate, '%Y-%m-%d %H:%i:%s') AS YYMMDD, result, win_amount FROM lad_bet WHERE userIdx='${userIdx}' ORDER BY regdate DESC LIMIT ${limit} OFFSET ${offset}`);

    res.render('ladderList', {
        userIdx,
        userBets,
        currentPage: page,
        totalPages
    });
});
// ######################### ladder end #########################


// ######################### kawi start #########################
// 로그인 체크 미들웨어
function checkLogin(req, res, next) {
    if (!req.session.email) {
        res.redirect('/login');
    } else {
        next();
    }
}

// 라우트 설정
app.get('/kawi', checkLogin, async (req, res) => {
    const userIdx = req.session.userIdx;
    let sql_sel1 = `SELECT userIdx, email, point, aah_balance, last_spin, last_result FROM users WHERE userIdx = ${userIdx}`;
    const user = await loadDB(sql_sel1);
    res.render('kawi', { user: user[0] });
});

app.post('/kawi_play', checkLogin, async (req, res) => {
    const userIdx = req.session.userIdx;
    const userChoice = req.body.choice;
    const betAmount = parseFloat(req.body.bet_amount);
    
    // 사용자 정보 가져오기
    let sql_sel1 = `SELECT aah_balance FROM users WHERE userIdx = ${userIdx}`;
    const user = await loadDB(sql_sel1);
    const userBalance = parseFloat(user[0].aah_balance);
    
    // 베팅 금액 검증
    if (betAmount <= 0 || betAmount > userBalance) {
        res.redirect('/kawi');
        return;
    }

    // 게임 통계 정보 가져오기
    let stats = await loadDB(`SELECT * FROM kawi_statistics WHERE stat_id = 1`);
    if (stats.length === 0) {
        // 초기화된 기록이 없으면 새로 삽입
        await saveDB(`INSERT INTO kawi_statistics (total_collected, total_paid) VALUES (0, 0)`);
        stats = await loadDB(`SELECT * FROM kawi_statistics WHERE stat_id = 1`);
    }
    let totalCollected = parseFloat(stats[0].total_collected);
    let totalPaid = parseFloat(stats[0].total_paid);

    const choices = ["가위", "바위", "보"];
    const computerChoice = choices[Math.floor(Math.random() * choices.length)];

    // 이기고 지고 비율 조정
    let winProbability = 0.5; // 기본 승률 50%
    const totalGames = totalCollected + totalPaid;
    if (totalGames > 0) {
        winProbability = (totalPaid / totalGames) * 0.5 + 0.25;
    }

    // 승부 계산 로직
    let result;
    if (Math.random() < winProbability) {
        // 사용자가 이기는 경우
        if ((userChoice === "가위" && computerChoice === "보") ||
            (userChoice === "바위" && computerChoice === "가위") ||
            (userChoice === "보" && computerChoice === "바위")) {
            result = '승리';
        } else if (userChoice === computerChoice) {
            result = '무승부';
        } else {
            result = '패배';
        }
    } else {
        // 사용자가 지는 경우
        if ((userChoice === "가위" && computerChoice === "바위") ||
            (userChoice === "바위" && computerChoice === "보") ||
            (userChoice === "보" && computerChoice === "가위")) {
            result = '패배';
        } else if (userChoice === computerChoice) {
            result = '무승부';
        } else {
            result = '승리';
        }
    }

    // 베팅 금액 및 잔액 업데이트
    if (result === '승리') {
        const winAmount = betAmount + (betAmount * 0.9);
        await saveDB("UPDATE users SET aah_balance = CAST(aah_balance AS DECIMAL(22,8)) + CAST('"+winAmount+"' AS DECIMAL(22,8)) WHERE userIdx = '"+userIdx+"'");
        totalPaid += winAmount;
    } else if (result === '패배') {
        await saveDB("UPDATE users SET aah_balance = CAST(aah_balance AS DECIMAL(22,8)) - CAST('"+betAmount+"' AS DECIMAL(22,8)) WHERE userIdx = '"+userIdx+"'");
        totalCollected += betAmount;
    }

    // 게임 통계 업데이트
    await saveDB(`UPDATE kawi_statistics SET total_collected = ${totalCollected}, total_paid = ${totalPaid} WHERE stat_id = 1`);

    // 로그 저장
    const logSQL = `INSERT INTO kawi_logs (userIdx, user_choice, computer_choice, result, bet_amount) VALUES (${userIdx}, '${userChoice}', '${computerChoice}', '${result}', ${betAmount})`;
    await saveDB(logSQL);

    // 결과 반환
    res.render('kawi_result', { userChoice, computerChoice, result });
});

app.get('/kawiList', checkLogin, async (req, res) => {
    const userIdx = req.session.userIdx;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // 사용자 게임 로그 가져오기
    const logsSQL = `SELECT * FROM kawi_logs WHERE userIdx = ${userIdx} ORDER BY log_time DESC LIMIT ${limit} OFFSET ${offset}`;
    const logs = await loadDB(logsSQL);

    // 총 로그 수 가져오기
    const countSQL = `SELECT COUNT(*) AS count FROM kawi_logs WHERE userIdx = ${userIdx}`;
    const countResult = await loadDB(countSQL);
    const totalLogs = countResult[0].count;
    const totalPages = Math.ceil(totalLogs / limit);

    res.render('kawiList', { logs, currentPage: page, totalPages });
});

// ######################### kawi end #########################

// ######################### scratch start #########################
app.get('/scratch', checkLogin, async (req, res) => {
    const userIdx = req.session.userIdx;
    const sql_sel1 = `SELECT userIdx, email, point, aah_balance FROM users WHERE userIdx = ${userIdx}`;
    const user = await loadDB(sql_sel1);
    if (user.length > 0) {
        res.render('scratch', {
            email: user[0].email,
            // balance: user[0].aah_balance
            balance: parseFloat(user[0].aah_balance).toFixed(2),
            message: '스크래치하여 상금을 확인하세요!'
        });
    } else {
        res.redirect('/login');
    }
});

app.post('/scratch_play', checkLogin, async (req, res) => {
    const userIdx = req.session.userIdx;

    let balance = await jsfn_getDB_AAH(userIdx);
    // console.log('Initial balance:', balance);

    // 1 CEIK 차감
    const betAmount = 1;
    if (parseFloat(balance) < betAmount) {
        let _errAlert = "<script>alert('잔액이 부족합니다.');document.location.href='/';</script>";
        res.send(_errAlert);
        return;
    }

    // 차감 후 balance 확인
    await saveDB("UPDATE users SET aah_balance=CAST(aah_balance AS DECIMAL(22,8))-CAST('"+betAmount+"' AS DECIMAL(22,8)) WHERE userIdx = '"+userIdx+"'");
    // balance = await jsfn_getDB_AAH(userIdx);
    // console.log('After deducting betAmount, balance:', balance);

    // mininglog 테이블에 기록
    const _memo = `즉석복권 구매 ${betAmount}`;
    let user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    await saveDB(`INSERT INTO mininglog (userIdx, aah_balance, regdate, regip, memo) VALUES ('${userIdx}', '${balance}', NOW(), '${user_ip}', '${_memo}')`);

    // 당첨 확률 세분화
    const probabilities = {
        100000: 0.01, // 1% 확률
        50000: 0.02,  // 2% 확률
        10000: 0.05,  // 5% 확률
        5000: 0.1,    // 10% 확률
        1000: 0.2,    // 20% 확률
        500: 0.3,     // 30% 확률
        100: 0.5,     // 50% 확률
        50: 0.7,      // 70% 확률
        1: 0.9,       // 90% 확률
        0.1: 0.99     // 99% 확률
    };

    let result = '패배';
    let multiplier = 0; // 승수

    for (const [ceik, prob] of Object.entries(probabilities)) {
        let _rndNum = Math.random();
        if (_rndNum < prob) {
            result = '승리';
            multiplier = ceik / 100000;
            break;
        }
    }

    let winnings = betAmount * multiplier;
    if (winnings.toFixed(2) == 0.00){
        winnings = 0.01;
    }
    const message = result === '승리' ? `축하합니다! ${winnings.toFixed(2)} CEIK를 받으셨습니다! ` : '다음 기회에!';

    // 승리 시 원금 + 90% 지급
    if (result === '승리') {
        const _memo2 = `즉석복권 승리 ${winnings}`;
        await saveDB(`INSERT INTO mininglog (userIdx, aah_balance, regdate, regip, memo) VALUES ('${userIdx}', '${winnings}', NOW(), '${user_ip}', '${_memo2}')`);
        await saveDB("UPDATE users SET aah_balance=CAST(aah_balance AS DECIMAL(22,8)) + CAST('"+winnings+"' AS DECIMAL(22,8)) WHERE userIdx='"+userIdx+"'");
        // balance = await jsfn_getDB_AAH(userIdx);
        // console.log('After winning, balance:', balance);
    }

    // 회수한 금액 및 지급한 금액 업데이트
    if (result === '패배') {
        await saveDB(`UPDATE scratch_statistics SET total_collected = total_collected + ${betAmount} WHERE id = 1`);
        await saveDB(`INSERT INTO scratch_log (userIdx, result, qty) VALUES ('${userIdx}', '${result}', '${betAmount}')`);
    } else {
        await saveDB(`UPDATE scratch_statistics SET total_paid = total_paid + ${winnings} WHERE id = 1`);
        await saveDB(`INSERT INTO scratch_log (userIdx, result, qty) VALUES ('${userIdx}', '${result}', '${winnings}')`);
    }

    let _aah_balance = await jsfn_getDB_AAH(userIdx);
    // console.log('Final balance:', _aah_balance);
    res.json({ message, balance: parseFloat(_aah_balance).toFixed(2) });
});
// ######################### scratch end #########################

// ######################### notice start #########################
app.get('/get_announcement', async (req, res) => {
    const sql = `SELECT * FROM bbs WHERE gubun = 1 ORDER BY created_at DESC LIMIT 1`;
    const notice = await loadDB(sql);
    if (notice.length > 0) {
        res.json(notice[0]);
    } else {
        res.json({ message: 'No announcements found.' });
    }
});

// 댓글 가져오기
app.get('/get_comments/:bbs_id', checkLogin, async (req, res) => {
    const bbsId = req.params.bbs_id;
    const sql = `SELECT * FROM bbs_comments WHERE bbs_id = '${bbsId}' ORDER BY created_at DESC`;
    const comments = await loadDB(sql);
    res.json(comments);
});

// 댓글 추가하기
app.post('/add_comment', express.json(), async (req, res) => {
    let { bbs_id, content } = req.body;
    bbs_id = jsfnRepSQLinj(bbs_id);
    content = jsfnRepSQLinj(content);
    if (!req.session.email) {
        res.json({ message: 'Need Login first' });
        return;
    }
    const userIdx = req.session.userIdx;
    const sql = "INSERT INTO bbs_comments (bbs_id, userIdx, content) VALUES ('" + bbs_id + "','" + userIdx + "', '" + content + "')";
    await saveDB(sql);
    res.json({ message: 'Comment added successfully.' });
});

// 게시물 리스트 가져오기 (페이징 포함)
app.get('/bbs_list', checkLogin, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // SQL 쿼리 문자열 생성
    const sql = `SELECT * FROM bbs WHERE GUBUN='2' ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const posts = await loadDB(sql);
    const countSql = `SELECT COUNT(*) AS count FROM bbs`;
    const countResult = await loadDB(countSql);
    const totalPosts = countResult[0].count;
    const totalPages = Math.ceil(totalPosts / limit);

    res.render('bbs_list', { posts, totalPages, currentPage: page });
});

// 게시물 상세 보기
app.get('/bbs_view/:bbs_id', checkLogin, async (req, res) => {
    const bbsId = req.params.bbs_id;
    const postSql = `SELECT * FROM bbs WHERE id = '${bbsId}'`;
    const commentSql = `SELECT * FROM bbs_comments WHERE bbs_id = '${bbsId}' ORDER BY created_at DESC`;
    const post = await loadDB(postSql);
    const comments = await loadDB(commentSql);

    if (post.length > 0) {
        res.render('bbs_view', { post: post[0], comments });
    } else {
        res.render('bbs_view', { message: 'Post not found', post: null, comments: [] });
    }
});

// 게시물 작성 페이지 렌더링
app.get('/bbs_write', checkLogin, (req, res) => {
    res.render('bbs_write');
});

// 게시물 작성하기
app.post('/bbs_write', checkLogin, async (req, res) => {
    let { title, content } = req.body;
    const userIdx = req.session.userIdx;
    const sql = "INSERT INTO bbs (userIdx, title, content, created_at) VALUES ('" + userIdx + "','" + title + "', '" + content + "', NOW())";
    await saveDB(sql);
    // res.render('bbs_write', { message: 'Post created successfully.' });
    res.json({ message: 'Post created successfully.' });
});
// ######################### notice end #########################

// ######################### buyCeik KRW start #########################
app.get('/buy', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
        return;
    }
    const userIdx = req.session.userIdx; // from session 

    res.render('buyceik_krw', {
        userIdx: userIdx
    });
});

app.post('/buy', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
        return;
    }
    const user_email = req.session.userEmail; // 사용자 이메일을 세션에서 가져오는 예시
    const s_userIdx = req.session.userIdx;
    const user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;

    const { username, amount, quantity } = req.body;

    try {
        // buylog 테이블에 임시 저장
        const sql = "INSERT INTO buylog (userIdx, username, amount, quantity, regdate, regip) VALUES ('"+s_userIdx+"', '"+username+"', '"+amount+"', '"+quantity+"', NOW(), '"+user_ip+"')";
        await saveDB(sql);

        // 구매 완료 페이지 렌더링
        res.render('buyceik_krw_ok', {
            amount: amount,
            quantity: quantity,
            email: user_email
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('서버 오류가 발생했습니다.');
    }
});

// 구매 리스트 페이지
app.get('/buylist', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
        return;
    }
    const user_email = req.session.userEmail; // 사용자 이메일을 세션에서 가져오는 예시
    const s_userIdx = req.session.userIdx;

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    try {
        // 총 구매 로그 수
        const totalLogsResult = await loadDB('SELECT COUNT(*) AS count FROM buylog');
        const totalLogs = totalLogsResult[0].count;
        const totalPages = Math.ceil(totalLogs / limit);

        // 구매 로그 불러오기
        const logs = await loadDB(`SELECT * FROM buylog LIMIT ${limit} OFFSET ${offset}`);

        res.render('buyceik_list', {
            logs: logs,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('서버 오류가 발생했습니다.');
    }
});

// 구매 승인 API
app.post('/approve', async (req, res) => {
    if (!req.session.email) {
        res.redirect('/login');
        return;
    }
    const user_email = req.session.userEmail; // 사용자 이메일을 세션에서 가져오는 예시
    const s_userIdx = req.session.userIdx;
    if(!(s_userIdx==40||s_userIdx==52)){
        let _errAlert = "<script>alert('관리자만 사용 가능 합니다.');document.location.href='/buylist';</script>";
        res.send(_errAlert);
        return;
    }

    const { logId } = req.body;
    try {
        // 구매 로그 가져오기
        const logResult = await loadDB(`SELECT * FROM buylog WHERE id = ${logId}`);
        if (!logResult.length) {
            return res.status(404).json({ success: false, message: '구매 로그를 찾을 수 없습니다.' });
        }

        const log = logResult[0];
        const { userIdx, amount, quantity } = log;

        // 사용자 계정 업데이트
        await saveDB(`UPDATE users SET aah_balance = CAST(aah_balance AS DECIMAL(22,8)) + CAST(${quantity} AS DECIMAL(22,8)) WHERE userIdx = '${userIdx}'`);

        // mininglog 테이블에 기록
        const _memo = `KRW 구매 ${quantity}`;
        await saveDB(`INSERT INTO mininglog (userIdx, aah_balance, regdate, regip, memo) VALUES ('${userIdx}', '${quantity}', NOW(), '${req.ip}', '${_memo}')`);

        // 승인된 로그를 buylog 테이블에서 상태 업데이트
        await saveDB(`UPDATE buylog SET status = 'approved' WHERE id = ${logId}`);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// ######################### buyCeik KRW end #########################

// ######################### web push start #########################
// VAPID 키 설정
const publicVapidKey = process.env.VAPID_PUBLIC;
const privateVapidKey = process.env.VAPID_PRIVATE;

webpush.setVapidDetails('mailto:c4ei.net@gmail.com', publicVapidKey, privateVapidKey);

app.post('/subscribe', async (req, res) => {
    const { userIdx, subscription } = req.body;
    const { endpoint, keys } = subscription;
    const strSQL = `
        INSERT INTO subscriptions (userIdx, endpoint, keys_p256dh, keys_auth)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE endpoint=VALUES(endpoint), keys_p256dh=VALUES(keys_p256dh), keys_auth=VALUES(keys_auth)
    `;

    try {
        await saveDB(mysql.format(strSQL, [userIdx, endpoint, keys.p256dh, keys.auth]));
        res.status(201).json({ message: 'Subscription saved' });
    } catch (error) {
        console.error('Error saving subscription:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/unsubscribe', async (req, res) => {
    const { endpoint } = req.body;
    const strSQL = `DELETE FROM subscriptions WHERE endpoint = ?`;

    try {
        await saveDB(mysql.format(strSQL, [endpoint]));
        res.status(200).json({ message: 'Subscription deleted' });
    } catch (error) {
        console.error('Error deleting subscription:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

const sendNotification = async (subscription, payload) => {
    try {
        await webpush.sendNotification(subscription, payload);
        console.log('Notification sent successfully');
    } catch (error) {
        console.error('Error sending notification:', error);
        if (error.statusCode === 410) {
            // 구독이 만료되었거나 취소된 경우
            const { endpoint } = subscription;
            console.log('Subscription has unsubscribed or expired:', endpoint);
            try {
                const strSQL = `DELETE FROM subscriptions WHERE endpoint = ?`;
                await saveDB(mysql.format(strSQL, [endpoint]));
                console.log('Expired subscription deleted from database');
            } catch (dbError) {
                console.error('Error deleting expired subscription from database:', dbError);
            }
        }
    }
};

// 5분마다 알림 보내기
cron.schedule('*/5 * * * *', async () => {
    console.log('Checking for records older than 2 hours-5분마다 알림 보내기');

    const query = ` SELECT userIdx, midx 
    FROM mininglog 
    WHERE regdate BETWEEN DATE_SUB(NOW(), INTERVAL 8 HOUR) AND DATE_SUB(NOW(), INTERVAL 2 HOUR)
        AND sendpushYN = 'N'
        AND memo LIKE '%WEB MINING%';
    `;

    try {
        const results = await loadDB(query);

        for (const row of results) {
            const userIdx = row.userIdx;
            const midx = row.midx;

            const subscriptionQuery = ` SELECT * FROM subscriptions WHERE userIdx = ? `;
            const subs = await loadDB(mysql.format(subscriptionQuery, [userIdx]));

            for (const sub of subs) {
                const subscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.keys_p256dh,
                        auth: sub.keys_auth
                    }
                };

                const payload = JSON.stringify({
                    title: 'CEIK 알림',
                    body: 'CEIK 적립이 가능해요!',
                    url: 'https://ceik.c4ei.net'  // 이동할 URL
                });
                await sendNotification(subscription, payload);

                // 알림을 보낸 후 sendpushYN 값을 Y로 업데이트
                const updateQuery = ` UPDATE mininglog SET sendpushYN = 'Y' WHERE midx = ? `;
                await saveDB(mysql.format(updateQuery, [midx]));
            }
        }
    } catch (error) {
        console.error('Error querying database:', error);
    }
});
// ######################### web push end #########################


function getCurTimestamp() {
    const d = new Date();
  
    return new Date(
      Date.UTC(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours(),
        d.getMinutes(),
        d.getSeconds()
      )
    // `toIsoString` returns something like "2017-08-22T08:32:32.847Z"
    // and we want the first part ("2017-08-22")
    ).toISOString().replace('T','_').replace('Z','');
}

// #########################################  
app.listen(process.env.PORT, () => {
    console.log(`서버가 http://localhost:${process.env.PORT} 포트에서 실행 중입니다.`);
});
// #########################################  

async function jsfn_getMyParty_idx(userIdx){
    let sql0 = "select party_idx from party_member userIdx where user_idx = '"+userIdx+"'";
    let result0 = await loadDB(sql0);
    let party_idx = 0;
    if(result0.length>0){
        party_idx= result0[0].party_idx;
    }
    return party_idx;
}

async function jsfn_getPartyName(Pid){
    let sql0 = "SELECT idx, partyName FROM parties where idx = '"+Pid+"'";
    let result0 = await loadDB(sql0);
    let _partyName = "없음";
    if(result0.length>0){
        _partyName= result0[0].partyName;
    }
    return _partyName;
}

async function fn_setMiningLog(userIdx, aah_balance, memo, user_ip){
    let sql = "INSERT INTO mininglog (userIdx, aah_balance, regip, memo) VALUES ('"+userIdx+"','"+aah_balance+"','"+user_ip+"','"+memo+"')";
    try{
        await saveDB(sql);
    }catch(e){
        console.log("fn_setMiningLog\n"+sql);
    }
}

async function fn_getAAHBalance(userIdx){
    let sql = "SELECT userIdx, aah_balance, reffer_id, reffer_cnt FROM users WHERE userIdx='"+userIdx+"'";
    let result = await loadDB(sql);
    // console.log(result.length +" : result.length" + JSON.stringify(result[0]) );
    if(result.length>0){
        _userIdx = result[0].userIdx;
        _aah_balance = result[0].aah_balance;
        _reffer_id = result[0].reffer_id;
        _reffer_cnt = result[0].reffer_cnt;
    }
    // console.log("216 fn_getIdFromEmail -> _userIdx : " + _userIdx);
    return {_userIdx, _aah_balance, _reffer_id, reffer_cnt};
}

async function fn_getIdFromEmail(email){
    let _userIdx = 0;
    let sql = "SELECT userIdx, email FROM users WHERE email='"+email+"'";
    let result = await loadDB(sql);
    // console.log(result.length +" : result.length" + JSON.stringify(result[0]) );
    if(result.length>0){
        _userIdx = result[0].userIdx;
    }
    // console.log("216 fn_getIdFromEmail -> _userIdx : " + _userIdx);
    return _userIdx;
}

async function fn_setPontLog(userIdx, point, memo, user_ip){
    let sql = "INSERT INTO pointlog (userIdx,POINT,regip,memo) VALUES ('"+userIdx+"','"+point+"','"+user_ip+"','"+memo+"')";
    try{
        await saveDB(sql);
    }catch(e){
        console.log("fn_setPontLog\n"+sql);
    }
}

async function fn_setPontLogByEmail(email, point, memo, user_ip){
    let userIdx = await fn_getIdFromEmail(email);
    let sql = "INSERT INTO pointlog (userIdx,POINT,regip,memo) VALUES ('"+userIdx+"','"+point+"','"+user_ip+"','"+memo+"')";
    try{
        await saveDB(sql);
    }catch(e){
        console.log("fn_setPontLogByEmail\n"+sql);
    }
}

/////////////////// air drop //////////////////////
/*
async function getBalanceCEIK(aah_addr){
    const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
    let wallet_balance = await tokenContract.methods.balanceOf(aah_addr).call();
    const tokenDecimals = 18; // 토큰의 decimals 확인 (예: 18)
    // 토큰 잔액을 이더로 변환
    wallet_balance = parseFloat(wallet_balance) / Math.pow(10, tokenDecimals);
    const ceikDecimals = 8 + 2; // CEIK 는 DECIMAL 8자리 인데 값이 안맞아 +2 넣어 줌
    wallet_balance = parseFloat(wallet_balance) * Math.pow(10, ceikDecimals);
    return wallet_balance;
}
*/
async function getBalanceCEIK(aah_addr) {
    try {
        // CEIK 토큰 계약 인스턴스 생성
        const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
        // CEIK 토큰 잔액 가져오기
        let wallet_balance = await tokenContract.methods.balanceOf(aah_addr).call();
        // CEIK 토큰의 decimals (예: 8)
        const tokenDecimals = 8;
        // 잔액을 소수점으로 변환
        wallet_balance = BigInt(wallet_balance);
        const final_balance = parseFloat(wallet_balance) / Math.pow(10, tokenDecimals);
        return final_balance;
    } catch (error) {
        console.error("Error fetching balance:", error);
        throw new Error("Failed to fetch balance");
    }
}

async function fn_unlockAccount(addr){
    let rtn_result = false;
    // console.log(addr +" / 671 : "+process.env.AAH_ADDR_PWD);
    await web3.eth.personal.unlockAccount(addr, process.env.AAH_ADDR_PWD, 500).then(function (result) {
        rtn_result = result;
        //   console.log('#### 674 #### fn_unlockAccount result :' + result);
    });
    return rtn_result;
}

async function fn_send_tx_log(fromId, send_addr, rcv_addr, rcv_amt, blockNumber,contractAddress,blockHash,transactionHash, memo, user_ip ){
    let strsql ="insert into sendlog (userIdx,`fromAddr`,`fromAmt`,`toAddr`,`toAmt`,`blockNumber`, `contractAddress` ,`blockHash`,`transactionHash`,`memo`,`regip`)";
    strsql =strsql + " values ('"+fromId+"','"+send_addr+"','"+rcv_amt+"','"+rcv_addr+"','"+rcv_amt+"','"+blockNumber+"','"+contractAddress+"','"+blockHash+"','"+transactionHash+"','"+memo+"','"+user_ip+"')";
    // console.log(strsql);
    saveDB(strsql);
}

const crypto = require("crypto");
const bip39 = require("bip39");

function generateSeedPhrases(numPhrases, numWords) {

    const words = ["abandon","ability","able","about","above","absent","absorb","abstract",
    "absurd","abuse","access","accident","account","accuse","achieve","acid","acoustic","acquire","across","act","action","actor","actress","actual","adapt","add","addict","address","adjust","admit","adult","advance","advice","aerobic","affair","afford","afraid","again","age","agent","agree","ahead","aim","air","airport","aisle","alarm","album","alcohol","alert","alien","all","alley","allow","almost","alone","alpha","already","also","alter","always","amateur","amazing","among","amount","amused","analyst","anchor","ancient","anger","angle","angry","animal","ankle","announce","annual","another","answer","antenna",
    "antique","anxiety","any","apart","apology","appear","apple","approve","april","arch","arctic","area","arena","argue","arm","armed","armor","army","around","arrange","arrest","arrive","arrow","art","artefact","artist","artwork","ask","aspect","assault","asset","assist","assume","asthma","athlete","atom","attack","attend","attitude","attract","auction","audit","august","aunt","author","auto","autumn","average","avocado","avoid","awake","aware","away","awesome","awful","awkward","axis","baby","bachelor","bacon","badge","bag","balance","balcony","ball","bamboo","banana","banner","bar","barely","bargain","barrel","base","basic","basket","battle","beach","bean","beauty","because","become","beef","before","begin","behave","behind","believe","below","belt","bench","benefit","best","betray","better","between","beyond","bicycle","bid","bike","bind","biology","bird","birth","bitter","black","blade","blame","blanket","blast","bleak","bless","blind","blood","blossom","blouse","blue","blur","blush","board","boat",
    "body","boil","bomb","bone","bonus","book","boost","border","boring","borrow","boss","bottom","bounce","box","boy","bracket","brain","brand","brass","brave","bread","breeze","brick","bridge","brief","bright","bring","brisk","broccoli","broken","bronze","broom","brother","brown","brush","bubble","buddy","budget","buffalo","build","bulb","bulk","bullet","bundle","bunker","burden","burger","burst","bus","business","busy","butter","buyer","buzz","cabbage","cabin","cable","cactus","cage","cake","call","calm","camera","camp","can","canal","cancel",
    "candy","cannon","canoe","canvas","canyon","capable","capital","captain","car","carbon","card","cargo","carpet","carry","cart","case","cash","casino","castle","casual","cat","catalog","catch","category","cattle","caught","cause","caution","cave","ceiling","celery","cement","census","century","cereal","certain","chair","chalk","champion","change","chaos","chapter","charge","chase","chat","cheap","check","cheese","chef","cherry","chest","chicken","chief","child","chimney","choice","choose","chronic","chuckle","chunk","churn","cigar","cinnamon","circle","citizen","city","civil","claim","clap","clarify","claw","clay","clean","clerk","clever","click","client","cliff","climb","clinic","clip","clock","clog","close","cloth","cloud","clown","club","clump","cluster","clutch","coach","coast","coconut","code","coffee","coil","coin","collect","color",
    "column","combine","come","comfort","comic","common","company","concert","conduct","confirm","congress","connect","consider","control","convince","cook","cool","copper","copy","coral","core","corn","correct","cost","cotton","couch","country","couple","course","cousin","cover","coyote","crack","cradle","craft","cram","crane","crash","crater","crawl","crazy","cream","credit","creek","crew","cricket","crime","crisp","critic","crop","cross","crouch","crowd","crucial","cruel","cruise","crumble","crunch","crush","cry","crystal","cube","culture","cup"
    ,"cupboard","curious","current","curtain","curve","cushion","custom","cute","cycle","dad","damage","damp","dance","danger","daring","dash","daughter","dawn","day","deal","debate","debris","decade","december","decide","decline","decorate","decrease","deer","defense","define","defy","degree","delay","deliver","demand","demise","denial","dentist","deny","depart","depend","deposit","depth","deputy","derive","describe","desert","design","desk","despair","destroy","detail","detect","develop","device","devote","diagram","dial","diamond","diary","dice","diesel","diet","differ","digital","dignity","dilemma","dinner","dinosaur","direct","dirt","disagree","discover","disease","dish","dismiss","disorder","display","distance","divert","divide","divorce","dizzy","doctor","document","dog","doll","dolphin","domain","donate","donkey","donor","door","dose","double","dove","draft","dragon","drama","drastic","draw","dream","dress","drift","drill","drink","drip","drive","drop","drum","dry","duck","dumb",
    "dune","during","dust","dutch","duty","dwarf","dynamic","eager","eagle","early","earn","earth","easily","east","easy","echo","ecology","economy","edge","edit","educate","effort","egg","eight","either","elbow","elder","electric","elegant","element","elephant","elevator","elite","else","embark","embody","embrace","emerge","emotion","employ","empower","empty","enable","enact","end","endless","endorse","enemy","energy","enforce","engage","engine","enhance","enjoy","enlist","enough","enrich","enroll","ensure","enter","entire","entry","envelope","episode","equal","equip","era","erase","erode","erosion","error","erupt","escape","essay","essence","estate","eternal","ethics","evidence","evil","evoke","evolve","exact","example","excess","exchange","excite","exclude","excuse","execute","exercise","exhaust","exhibit","exile","exist","exit","exotic","expand","expect","expire","explain","expose","express","extend","extra","eye","eyebrow","fabric","face","faculty","fade","faint","faith","fall","false","fame","family","famous","fan","fancy","fantasy","farm","fashion","fat","fatal","father","fatigue","fault","favorite","feature","february","federal","fee","feed","feel","female","fence","festival","fetch","fever","few","fiber","fiction","field","figure","file","film","filter","final","find","fine","finger",
    "finish","fire","firm","first","fiscal","fish","fit","fitness","fix","flag","flame","flash","flat","flavor","flee","flight","flip","float","flock","floor","flower","fluid","flush","fly","foam","focus","fog","foil","fold","follow","food","foot","force","forest","forget","fork","fortune","forum","forward","fossil","foster","found","fox","fragile","frame","frequent","fresh","friend","fringe","frog","front","frost","frown","frozen","fruit","fuel","fun","funny","furnace","fury","future","gadget","gain","galaxy","gallery","game","gap","garage","garbage","garden","garlic","garment","gas","gasp","gate","gather","gauge","gaze","general","genius","genre","gentle","genuine","gesture","ghost","giant","gift","giggle","ginger","giraffe","girl","give","glad","glance","glare","glass","glide","glimpse","globe","gloom","glory","glove","glow","glue","goat",
    "goddess","gold","good","goose","gorilla","gospel","gossip","govern","gown","grab","grace","grain","grant","grape","grass","gravity","great","green","grid","grief","grit","grocery","group","grow","grunt","guard","guess","guide","guilt","guitar","gun","gym","habit","hair","half","hammer","hamster","hand","happy","harbor","hard","harsh","harvest","hat","have","hawk","hazard","head","health","heart","heavy","hedgehog","height","hello","helmet","help","hen","hero","hidden","high","hill","hint","hip","hire","history","hobby","hockey","hold","hole","holiday","hollow","home","honey","hood","hope","horn","horror","horse","hospital","host","hotel","hour","hover","hub","huge","human","humble","humor","hundred","hungry","hunt","hurdle","hurry","hurt","husband","hybrid","ice","icon","idea","identify","idle","ignore","ill","illegal","illness","image","imitate","immense","immune","impact","impose","improve","impulse","inch","include","income","increase","index","indicate","indoor","industry","infant","inflict","inform","inhale","inherit","initial","inject","injury","inmate","inner","innocent","input","inquiry","insane","insect","inside","inspire","install","intact","interest","into","invest","invite","involve","iron","island","isolate","issue","item","ivory","jacket","jaguar","jar","jazz","jealous","jeans","jelly","jewel","job","join","joke","journey","joy","judge","juice","jump","jungle","junior","junk","just","kangaroo","keen","keep","ketchup","key","kick",
    "kid","kidney","kind","kingdom","kiss","kit","kitchen","kite","kitten","kiwi","knee","knife","knock","know","lab","label","labor","ladder","lady","lake","lamp","language","laptop","large","later","latin","laugh","laundry","lava","law","lawn","lawsuit","layer","lazy","leader","leaf","learn","leave","lecture","left","leg","legal","legend","leisure","lemon","lend","length","lens","leopard","lesson","letter","level","liar","liberty","library","license","life","lift","light","like","limb","limit","link","lion","liquid","list","little","live","lizard","load","loan","lobster","local","lock","logic","lonely","long","loop","lottery","loud","lounge","love","loyal","lucky","luggage","lumber","lunar","lunch","luxury","lyrics","machine","mad","magic","magnet","maid","mail","main","major","make","mammal","man","manage","mandate","mango","mansion","manual","maple","marble","march","margin","marine","market","marriage","mask","mass","master","match","material","math","matrix","matter","maximum","maze","meadow","mean","measure","meat","mechanic","medal","media","melody","melt","member","memory","mention","menu","mercy","merge","merit","merry","mesh","message","metal","method","middle","midnight","milk","million","mimic","mind","minimum","minor","minute","miracle","mirror","misery","miss","mistake","mix","mixed","mixture","mobile","model","modify","mom","moment","monitor","monkey","monster","month","moon","moral","more","morning","mosquito","mother","motion","motor","mountain","mouse","move","movie","much","muffin","mule","multiply","muscle","museum","mushroom","music","must","mutual","myself","mystery","myth","naive","name","napkin","narrow","nasty","nation","nature","near","neck","need","negative","neglect","neither","nephew","nerve","nest","net","network","neutral",
    "never","news","next","nice","night","noble","noise","nominee","noodle","normal","north","nose","notable","note","nothing","notice","novel","now","nuclear","number","nurse","nut","oak","obey","object","oblige","obscure","observe","obtain","obvious","occur","ocean","october","odor","off","offer","office","often","oil","okay","old","olive","olympic","omit","once","one","onion","online","only","open","opera","opinion","oppose","option","orange","orbit","orchard","order","ordinary","organ","orient","original","orphan","ostrich","other","outdoor","outer","output","outside","oval","oven","over","own","owner","oxygen","oyster","ozone","pact","paddle","page","pair","palace","palm","panda","panel","panic","panther","paper","parade","parent","park","parrot","party","pass","patch","path","patient","patrol","pattern","pause","pave","payment","peace","peanut","pear","peasant","pelican","pen","penalty","pencil","people","pepper","perfect","permit","person","pet","phone","photo","phrase","physical","piano","picnic","picture","piece","pig","pigeon","pill","pilot","pink","pioneer","pipe","pistol","pitch","pizza","place","planet","plastic","plate","play","please","pledge","pluck","plug","plunge","poem","poet","point","polar","pole","police","pond","pony","pool","popular","portion","position","possible","post","potato","pottery",
    "poverty","powder","power","practice","praise","predict","prefer","prepare","present","pretty","prevent","price","pride","primary","print","priority","prison","private","prize","problem","process","produce","profit","program","project","promote","proof","property","prosper","protect","proud","provide","public","pudding","pull","pulp","pulse","pumpkin","punch","pupil","puppy","purchase","purity","purpose","purse","push","put","puzzle","pyramid","quality","quantum","quarter","question","quick","quit","quiz","quote","rabbit","raccoon","race","rack","radar","radio","rail","rain","raise","rally","ramp","ranch","random","range","rapid","rare","rate","rather","raven","raw","razor","ready","real","reason","rebel","rebuild","recall","receive","recipe","record","recycle","reduce","reflect","reform","refuse","region","regret","regular","reject","relax","release","relief","rely","remain","remember","remind","remove","render","renew","rent","reopen","repair","repeat","replace","report","require","rescue","resemble","resist","resource","response","result","retire","retreat","return","reunion","reveal","review","reward","rhythm","rib","ribbon","rice",
    "rich","ride","ridge","rifle","right","rigid","ring","riot","ripple","risk","ritual","rival","river","road","roast","robot","robust","rocket","romance","roof","rookie","room","rose","rotate","rough","round","route","royal","rubber","rude","rug","rule","run","runway","rural","sad","saddle","sadness","safe","sail","salad","salmon","salon","salt","salute","same","sample","sand","satisfy","satoshi","sauce","sausage","save","say","scale","scan","scare","scatter","scene","scheme","school","science","scissors","scorpion","scout","scrap","screen","script","scrub","sea","search","season","seat","second","secret","section","security","seed","seek","segment","select","sell","seminar","senior","sense","sentence","series","service","session","settle","setup","seven","shadow","shaft","shallow","share","shed","shell","sheriff","shield","shift","shine","ship","shiver","shock","shoe","shoot","shop","short","shoulder","shove","shrimp","shrug","shuffle","shy","sibling","sick","side","siege","sight","sign","silent","silk","silly","silver","similar","simple","since","sing","siren","sister","situate","six","size","skate","sketch","ski","skill","skin","skirt","skull","slab","slam","sleep","slender","slice","slide","slight","slim","slogan","slot","slow","slush","small","smart","smile","smoke","smooth","snack","snake","snap",
    "sniff","snow","soap","soccer","social","sock","soda","soft","solar","soldier","solid","solution","solve","someone","song","soon","sorry","sort","soul","sound","soup","source","south","space","spare","spatial","spawn","speak","special","speed","spell","spend","sphere","spice","spider","spike","spin","spirit","split","spoil","sponsor","spoon","sport","spot","spray","spread","spring","spy","square","squeeze","squirrel","stable","stadium","staff","stage","stairs","stamp","stand","start","state","stay","steak","steel","stem","step","stereo","stick","still","sting","stock","stomach","stone","stool","story","stove","strategy","street","strike","strong","struggle","student","stuff","stumble","style","subject","submit","subway","success","such","sudden","suffer","sugar","suggest","suit","summer","sun","sunny","sunset","super","supply","supreme","sure","surface","surge","surprise","surround","survey","suspect","sustain","swallow","swamp","swap","swarm","swear","sweet","swift","swim","swing","switch","sword","symbol","symptom","syrup","system","table","tackle","tag","tail","talent","talk","tank","tape","target","task","taste","tattoo","taxi","teach","team","tell","ten","tenant","tennis","tent","term","test","text","thank","that","theme","then","theory","there","they","thing","this","thought","three","thrive","throw","thumb",
    "thunder","ticket","tide","tiger","tilt","timber","time","tiny","tip","tired","tissue","title","toast","tobacco","today","toddler","toe","together","toilet","token","tomato","tomorrow","tone","tongue","tonight","tool","tooth","top","topic","topple","torch","tornado","tortoise","toss","total","tourist","toward","tower","town","toy","track","trade","traffic","tragic","train","transfer","trap","trash","travel","tray","treat","tree","trend","trial","tribe","trick","trigger","trim","trip","trophy","trouble","truck","true","truly","trumpet","trust","truth","try","tube","tuition","tumble","tuna","tunnel","turkey","turn","turtle","twelve","twenty","twice","twin","twist","two","type","typical","ugly","umbrella","unable","unaware","uncle","uncover","under","undo","unfair","unfold","unhappy","uniform","unique","unit","universe","unknown","unlock","until","unusual","unveil","update","upgrade","uphold","upon","upper","upset","urban","urge","usage","use","used","useful","useless","usual","utility",
    "vacant","vacuum","vague","valid","valley","valve","van","vanish","vapor","various","vast","vault","vehicle","velvet","vendor","venture","venue","verb","verify","version","very","vessel","veteran","viable","vibrant","vicious","victory","video","view","village","vintage","violin","virtual","virus","visa","visit","visual","vital","vivid","vocal","voice","void","volcano","volume","vote","voyage","wage","wagon","wait","walk","wall","walnut","want","warfare","warm","warrior","wash","wasp","waste","water","wave","way","wealth","weapon","wear","weasel","weather","web","wedding","weekend","weird","welcome","west","wet","whale","what","wheat","wheel","when","where","whip","whisper","wide","width","wife","wild","will","win","window","wine","wing","wink","winner","winter","wire","wisdom","wise","wish","witness","wolf","woman","wonder","wood","wool","word","work","world","worry","worth","wrap","wreck","wrestle","wrist","write","wrong",
    "yard","year","yellow","you","young","youth","zebra","zero","zone","zoo"];

  const seedPhrases = [];

  for (let i = 0; i < numPhrases; i++) {
    const seedPhrase = [];

    for (let j = 0; j < numWords; j++) {
      const randomIndex = crypto.randomInt(0, words.length);
      if(j == 0){ seedPhrase.push("\""+words[randomIndex]); }
      else{
        if(j == numWords-1){ 
            seedPhrase.push(words[randomIndex]+"\"");
        }
        else{
            seedPhrase.push(words[randomIndex]);
        }
      }
    }

    seedPhrases.push(seedPhrase.join(" "));
  }

  return seedPhrases;
}

async function fn_makeAddress(email){
    const numPhrases = 1;
    const numWords = 12;
    const seedPhrases = generateSeedPhrases(numPhrases, numWords);
    const seed = seedPhrases[0].replace(/"/g,"");
    const seedBuffer = await bip39.mnemonicToSeed(seed);
    const rootNode = await web3.eth.accounts.privateKeyToAccount("0x" + seedBuffer.slice(0, 32).toString("hex") );
    const pub_key = await rootNode.address.toString();
    // const pri_key = "0x" + seedBuffer.slice(0, 32).toString("hex");
    const pri_key = seedBuffer.slice(0, 32).toString("hex");

    // console.log(pub_key +" : pub_key / " + pri_key +" : pri_key / " + seed +" : seed " );
    // console.log( jsfn_encrypt(pri_key) +" : encrypt_pri_key / " + jsfn_encrypt(seed) +" : encrypt_seed " );
    sql = "";
    sql = sql + " update users set pub_key='"+pub_key+"' , pri_key='"+jsfn_encrypt(pri_key)+"' ,seed='"+jsfn_encrypt(seed)+"' where email = '"+email+"' "
    saveDB(sql);
    try {
        console.log(pub_key +" : pub_key \n "+pri_key+" : pri_key");
        await web3.personal.importRawKey( String(pri_key) , process.env.AAH_ADDR_PWD, function(error, result) { console.log(result); });
    } catch(e){
        console.log("857_importRawKey-"+e);
    }
}

async function getBalance(address) {
    return web3.eth.getBalance(address);
}

function jsfn_encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function jsfn_decrypt(encrypted) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function jsfnRepSQLinj(str) {
    if (typeof str !== 'string') return str; // 문자열 타입이 아닌 경우 그대로 반환
    str = str.replace(/'/g, '`'); // 모든 '을 `로 대체
    str = str.replace(/--/g, ''); // 모든 --을 제거
    return str;
}
// fn_makeAddress();
