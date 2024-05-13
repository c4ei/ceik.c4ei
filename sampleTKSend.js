const senderPrivateKey = Buffer.from(process.env.AAH_BANK_PRVKEY, 'hex');

// Klaytn 지갑을 사용하여 트랜잭션 서명을 위한 계정 생성
const senderAccount = web3.eth.accounts.privateKeyToAccount(senderPrivateKey);

// 계정 주소 확인
const senderAddress = senderAccount.address;

// 수신자 주소
const receiverAddress = '수신자 주소를 여기에 입력';

// 트랜잭션 데이터 생성
const txData = tokenContract.methods.transfer(receiverAddress, web3.utils.toWei('1', 'ether')).encodeABI();

// 트랜잭션 생성
const rawTx = {
    from: senderAddress,
    to: tokenContract.options.address,
    gas: 200000, // 가스 한도
    data: txData
};

// 트랜잭션 서명
web3.eth.accounts.signTransaction(rawTx, senderPrivateKey)
    .then((signedTx) => {
        // 서명된 트랜잭션 전송
        web3.eth.sendSignedTransaction(signedTx.rawTransaction)
            .on('transactionHash', (hash) => {
                console.log('트랜잭션 해시:', hash);
            })
            .on('receipt', (receipt) => {
                console.log('트랜잭션 영수증:', receipt);
            })
            .on('error', (error) => {
                console.error('트랜잭션 전송 중 오류 발생:', error);
            });
    })
    .catch((error) => {
        console.error('트랜잭션 서명 중 오류 발생:', error);
    });
