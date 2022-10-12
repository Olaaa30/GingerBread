const {
  FlashbotsBundleProvider,
} = require("@flashbots/ethers-provider-bundle");
const ethers = require("ethers");
const { func } = require("joi");
const Avalanche = require("avalanche").Avalanche;
require("dotenv").config();
const provider = new ethers.providers.JsonRpcProvider({
  url: process.env.C_CHAIN_TEST_NODE,
});
const privateKey = process.env.PRIVATE_KEY;
const authSigner = new ethers.Wallet(process.env.AUTH_SIGNER);
// For sending a signed transaction to the network
const nodeURL = "https://api.avax-test.network/ext/bc/C/rpc";
const HTTPSProvider = new ethers.providers.JsonRpcProvider(nodeURL);
// For estimating max fee and priority fee using CChain APIs
const chainId = 43113;
const avalanche = new Avalanche(
  "api.avax-test.network",
  undefined,
  "https",
  chainId
);
const cchain = avalanche.CChain();
// For signing an unsigned transaction
const wallet = new ethers.Wallet(privateKey, authSigner);
const address = wallet.address;
// Function to estimate max fee and max priority fee
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

const sendTxToFlashBotRelay = async () => {
  const to = "0x856EA4B78947c3A5CD2256F85B2B147fEBDb7124";
  nonce = await provider.getTransactionCount(address);
  let amount = "0.000001";

  ({ maxFeePerGas, maxPriorityFeePerGas } = await calcFeeData(
    maxFeePerGas = undefined,
    maxPriorityFeePerGas = undefined,
  ));
  maxFeePerGas = ethers.utils.parseUnits(maxFeePerGas, "gwei");
  maxPriorityFeePerGas = ethers.utils.parseUnits(maxPriorityFeePerGas, "gwei");
  console.log(`maxfeepergas = ${maxFeePerGas}`);
  console.log(`maxpriorityfeepergas = ${maxPriorityFeePerGas}`);
  const tx = {
    type: 2,
    nonce,
    to: to,
    maxPriorityFeePerGas,
    maxFeePerGas,
    value: ethers.utils.parseEther(amount),
    chainId,
  };

  const flashbotsProvider = await FlashbotsBundleProvider.create(
    provider,
    authSigner
  );

  const signedBundle = await flashbotsProvider.signBundle([
    {
      signer: authSigner,
      transaction: tx,
    },
  ]);

  const bundleReceipt = await flashbotsProvider.sendRawBundle(
    signedBundle,
    TARGET_BLOCK_NUMBER
  );
  console.log(bundleReceipt);
};
sendTxToFlashBotRelay();
// setting max fee as 100 and priority fee as 2
//sendAvax("0.000001", "0x856EA4B78947c3A5CD2256F85B2B147fEBDb7124");
