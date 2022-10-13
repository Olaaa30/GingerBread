// const {
//   FlashbotsBundleProvider,
// } = require("@flashbots/ethers-provider-bundle");
const { ethers, BigNumber} = require("ethers");
const { func } = require("joi");
const Avalanche = require("avalanche").Avalanche;
require("dotenv").config();
const privateKey = process.env.PRIVATE_KEY;
const authSigner = new ethers.Wallet(process.env.AUTH_SIGNER);
// For sending a signed transaction to the network
const nodeURL =
  "https://avalanche-mainnet.infura.io/v3/14088fbaadaf42a189235cbb57ce9420";
const HTTPSProvider = new ethers.providers.JsonRpcProvider(nodeURL);
// For estimating max fee and priority fee using CChain APIs
const chainId = "43114";
const networkId = 1;
const avalanche = new Avalanche("api.avax.network", undefined, "https", chainId);
// const chainId = 43114;
// const avalanche = new Avalanche(
//   "api.avax.network",
//   undefined,
//   "https",
//   chainId
// );
const cchain = avalanche.CChain();
const calcFeeData = async (
  maxFeePerGas = undefined,
  maxPriorityFeePerGas = undefined
) => {
  const baseFee = parseInt(await cchain.getBaseFee(), 16) / 1e9;
  maxPriorityFeePerGas =
    maxPriorityFeePerGas == undefined
      ? parseInt(await cchain.getMaxPriorityFeePerGas(), 16) / 1e9
      : maxPriorityFeePerGas;
  maxFeePerGas =
    maxFeePerGas == undefined ? baseFee + maxPriorityFeePerGas : maxFeePerGas;

  if (maxFeePerGas < maxPriorityFeePerGas) {
    throw "Error: Max fee per gas cannot be less than max priority fee per gas";
  }

  return {
    maxFeePerGas: maxFeePerGas.toString(),
    maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
  };
};
// const baseFee = parseInt(await cchain.getBaseFee(), 16) / 1e9.then
// let maxFeePerGas,
//   maxPriorityFeePerGas = calcFeeData(
//     (maxFeePerGas = undefined),
//     (maxPriorityFeePerGas = undefined)
//   )
//     .then(console.log(maxFeePerGas))
//     .then(console.log(maxPriorityFeePerGas));
const getBaseFee = async () => {
  const wallet = new ethers.Wallet(privateKey, HTTPSProvider);
  try {
    // let baseFee =
    //   parseInt(await cchain.getBaseFee(), 16) / 1e9;
    // let gasLimit = BigNumber.from("500000");
    // let gasPrice = await wallet.getGasPrice();
    // gasPrice = ethers.utils.formatEther(gasPrice.toString(), "wei");
    // gasLimit = ethers.utils.formatEther(gasLimit.toString());
    // let estimate = parseInt(await wallet.estimateGas(), 16);
    // let gasCost = gasLimit.mul(gasPrice);
    const gasLimit = BigNumber.from("350000");
    const gasPrice = await wallet.getGasPrice();
    const gasCost = gasLimit.mul(gasPrice);
    // parseInt(Number(ethers.utils.formatEther(gasCost)));
    // console.log(parseInt(baseFee, 16));
    console.log(parseInt(gasPrice, 16) / 1e16);
    // console.log(estimate);
    console.log(parseInt(gasCost, 16) / 1e16);
    // console.log(gasLimit, 16 / 1e16);
  } catch (err) {
    console.log(new Error(err.message));
    setTimeout(() => {}, 3000);
  }
};
getBaseFee();
// // For signing an unsigned transaction

// const address = wallet.address;
// // Function to estimate max fee and max priority fee
//

// const sendTxToFlashBotRelay = async () => {
//   const to = "0x856EA4B78947c3A5CD2256F85B2B147fEBDb7124";
//   nonce = await provider.getTransactionCount(address);
//   let amount = "0.000001";

//
//   maxFeePerGas = ethers.utils.parseUnits(maxFeePerGas, "gwei");
//   maxPriorityFeePerGas = ethers.utils.parseUnits(maxPriorityFeePerGas, "gwei");
//   console.log(`maxfeepergas = ${maxFeePerGas}`);
//   console.log(`maxpriorityfeepergas = ${maxPriorityFeePerGas}`);
//   const tx = {
//     type: 2,
//     nonce,
//     to: to,
//     maxPriorityFeePerGas,
//     maxFeePerGas,
//     value: ethers.utils.parseEther(amount),
//     chainId,
//   };

//   const flashbotsProvider = await FlashbotsBundleProvider.create(
//     provider,
//     authSigner
//   );

//   const signedBundle = await flashbotsProvider.signBundle([
//     {
//       signer: authSigner,
//       transaction: tx,
//     },
//   ]);

//   const bundleReceipt = await flashbotsProvider.sendRawBundle(
//     signedBundle,
//     TARGET_BLOCK_NUMBER
//   );
//   console.log(bundleReceipt);
// };
// sendTxToFlashBotRelay();
// setting max fee as 100 and priority fee as 2
//sendAvax("0.000001", "0x856EA4B78947c3A5CD2256F85B2B147fEBDb7124");
