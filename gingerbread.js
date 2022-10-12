const { ethers, BigNumber } = require("ethers");
const Avalanche = require("avalanche").Avalanche;
const chalk = require("chalk");
const Joi = require("joi");
const EventEmitter = require("events");
const pangolin = require("./dex/pangolin.js");
const traderjoe = require("./dex/traderjoe.js");
const {
  FlashbotsBundleProvider,
} = require("@flashbots/ethers-provider-bundle");

const {
  abi: pangolinPairAbi,
} = require("@pangolindex/exchange-contracts/artifacts/contracts/pangolin-core/interfaces/IPangolinPair.sol/IPangolinPair.json");
const {
  abi: traderjoePairAbi,
} = require("@traderjoe-xyz/core/artifacts/contracts/traderjoe/interfaces/IJoePair.sol/IJoePair.json");
const flashSwap = require("./artifacts/contracts/FlashSwapper.sol/FlashSwapper.json");
const ERC20 = require("./ERC20.js");
const convertToAvax = require("./utils/convertToAvax.js");
const { AbiCoder } = require("ethers/lib/utils.js");
const { network } = require("hardhat");
require("dotenv/config.js");

// For estimating max fee and priority fee using CChain APIs
const chainId = "0xa86a";
const networkId = 1;
const avalanche = new Avalanche(
  "api.avax.network",
  9650,
  "https",
  networkId,
  chainId
);


const cchain = avalanche.CChain()
// Function to estimate max fee and max priority fee
const calcFeeData = async (
  maxFeePerGas = undefined,
  maxPriorityFeePerGas = undefined
) => {
  const baseFee = parseInt(await cchain.getBaseFee(), 16) / 1e9
  maxPriorityFeePerGas =
    maxPriorityFeePerGas == undefined
      ? parseInt(await cchain.getMaxPriorityFeePerGas(), 16) / 1e9
      : maxPriorityFeePerGas
  maxFeePerGas =
    maxFeePerGas == undefined ? baseFee + maxPriorityFeePerGas : maxFeePerGas

  if (maxFeePerGas < maxPriorityFeePerGas) {
    throw "Error: Max fee per gas cannot be less than max priority fee per gas"
  }

  return {
    maxFeePerGas: maxFeePerGas.toString(),
    maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
  }
}
/**
 * GingerBread is an arbitrage bot that runs on the AVALANCHE C-CHAIN
 * To configure it to run on another network, change the environment variables to point to a node running on another network
 * This bot only works when one of the tokens compared is the native coin of the network - in this case WAVAX is the native coin of the AVALANCHE C-CHAIN
 * @class
 */
class GingerBread extends EventEmitter {
  pangolinSwapRate = 0.3; // 0.3%
  traderjoeSwapRate = 0.3; // 0.3%

  /**
   * @param token0
   * @param token1
   * @param reverseRate
   */
  constructor(token0, token1, reverseRate = false) {
    /**
     * @function tokenSchema - to validate the token objects being used to initialize bot
     */
    const tokenSchema = Joi.object({
      address: Joi.string()
        .length(42)
        .lowercase()
        .pattern(/^0x[a-f0-9]{40}$/)
        .required(),
      volume: Joi.number().min(0).required(),
    });
    const { value: Token0, error: Token0Error } = tokenSchema.validate(token0);
    const { value: Token1, error: Token1Error } = tokenSchema.validate(token1);
    if (Token0Error) throw new Error(Token0Error["details"][0]["message"]);
    if (Token1Error) throw new Error(Token1Error["details"][0]["message"]);

    // - initialize bot variables
    super();
    this.web3Provider = new ethers.providers.JsonRpcProvider(
      process.env.C_CHAIN_NODE
    );
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.web3Provider);
    this.reverseRate = reverseRate;
    this.ERCToken0 = new ERC20(Token0["address"]);
    this.ERCToken1 = new ERC20(Token1["address"]);
    this.token0 = Token0["address"];
    this.token1 = Token1["address"];
    this.flashSwapAddress = process.env.FLASH_SWAP_ADDRESS;
    this.TOKEN0_TRADE = Token0["volume"];
    this.TOKEN1_TRADE = Token1["volume"];
    this.FlashSwapContract = new ethers.Contract(
      process.env.FLASH_SWAP_ADDRESS,
      flashSwap["abi"],
      this.wallet
    );
  }

  /**
   * @async function for running the bot
   * @method bake
   */
  bake = async () => {
    // - load contracts from pangolin
    const PangolinFactory = new ethers.Contract(
      pangolin["ADDRESS"],
      pangolin["ABI"],
      this.wallet
    );
    const pangolinPairAddress = await PangolinFactory.getPair(
      this.token0,
      this.token1
    );
    const pangolinPair = new ethers.Contract(
      pangolinPairAddress,
      pangolinPairAbi,
      this.wallet
    );

    // - load contracts from traderjoe
    const TraderjoeFactory = new ethers.Contract(
      traderjoe["ADDRESS"],
      traderjoe["ABI"],
      this.wallet
    );
    const traderjoePairAddress = await TraderjoeFactory.getPair(
      this.token0,
      this.token1
    );
    const TraderjoePair = new ethers.Contract(
      traderjoePairAddress,
      traderjoePairAbi,
      this.wallet
    );

    // - load tokens info
    const token0Symbol = await this.ERCToken0.symbol();
    const token1Symbol = await this.ERCToken1.symbol();
    const token0Decimals = await this.ERCToken0.decimals();
    const token1Decimals = await this.ERCToken1.decimals();

    // initialize boolean to pause callback function below when currently executing a transaction
    let freeze = false;

    /**
     * @async function to listen to newly mined block
     */
    this.web3Provider.on("block", async (blockNumber) => {
      if (freeze) return;
      try {
        console.log(
          "\n>> " + chalk.blue("Current block: ") + chalk.red.bold(blockNumber)
        );

        // - get price from pangolin
        const pangolinReserves = await pangolinPair.getReserves();
        const pangolinReserve0 = Number(
          ethers.utils.formatUnits(pangolinReserves[0], token0Decimals)
        );
        const pangolinReserve1 = Number(
          ethers.utils.formatUnits(pangolinReserves[1], token1Decimals)
        );
        const pangolinPrice = this.reverseRate
          ? pangolinReserve1 / pangolinReserve0
          : pangolinReserve0 / pangolinReserve1;

        // - get price from traderjoe
        const traderjoeReserves = await TraderjoePair.getReserves();
        const traderjoeReserve0 = Number(
          ethers.utils.formatUnits(traderjoeReserves[0], token0Decimals)
        );
        const traderjoeReserve1 = Number(
          ethers.utils.formatUnits(traderjoeReserves[1], token1Decimals)
        );
        const traderjoePrice = this.reverseRate
          ? traderjoeReserve1 / traderjoeReserve0
          : traderjoeReserve0 / traderjoeReserve1;

        // - check if the difference can cover DEX fees ------------------------------------------------------->
        const tokenToBorrow =
          traderjoePrice > pangolinPrice && traderjoePrice > 0
            ? this.token1
            : this.token0;
        const tokenToBorrowSymbol =
          tokenToBorrow === this.token0 ? token0Symbol : token1Symbol;
        const tokenToReturnSymbol =
          tokenToBorrow === this.token0 ? token1Symbol : token0Symbol;

        let volumeToBorrow;
        let totalRepaymentInReturnToken;
        let totalReceivedTokensFromSwap;
        const lendFeeMultiplier = 1 + this.pangolinSwapRate / 100;
        const swapFeeMultiplier = 1 - this.traderjoeSwapRate / 100;

        if (tokenToBorrow === this.token0) {
          volumeToBorrow = this.TOKEN0_TRADE;
          totalRepaymentInReturnToken =
            (volumeToBorrow / pangolinPrice) * lendFeeMultiplier;
          totalReceivedTokensFromSwap =
            (volumeToBorrow / traderjoePrice) * swapFeeMultiplier;
        } else if (tokenToBorrow === this.token1) {
          volumeToBorrow = this.TOKEN1_TRADE;
          totalRepaymentInReturnToken =
            volumeToBorrow * pangolinPrice * lendFeeMultiplier;
          totalReceivedTokensFromSwap =
            volumeToBorrow * traderjoePrice * swapFeeMultiplier;
        }

        const potentialProfitInReturnToken =
          totalReceivedTokensFromSwap - totalRepaymentInReturnToken;
        const potentialProfitInAVAX = await convertToAvax(
          tokenToBorrow === this.token0 ? this.token1 : this.token0,
          potentialProfitInReturnToken
        );
        const shouldConsiderTrade = potentialProfitInReturnToken > 0;
        // -------------------------------------------------------------------------------------------------------

        // - tabulate the result to the console
        this.taste(
          token0Symbol,
          token1Symbol,
          traderjoePrice,
          pangolinPrice,
          potentialProfitInReturnToken,
          tokenToBorrowSymbol,
          volumeToBorrow,
          tokenToReturnSymbol
        );

        /**
         * @async function to EXECUTE ARBITRAGE TRADE
         */
        freeze = true;
        // const arbitrageTx = await this.FlashSwapContract.flashSwap(
        //   pangolinPairAddress,
        //   tokenToBorrow,
        //   ethers.utils.parseEther(`${volumeToBorrow}`).toString(),
        //   { gasLimit }
        // );
        let ABI = [
          "function flashSwap(address _pairAddress, address _tokenToBorrow, uint256 _amountToBorrow)",
        ];
        let iface = new ethers.utils.Interface(ABI);
        // await arbitrageTx.wait();
        // this.emit("tx-hash", { hash: arbitrageTx.hash });
        freeze = false;
        // -------------------------------------------------------->

        // If the max fee or max priority fee is not provided, then it will automatically calculate using CChain APIs
        ({ maxFeePerGas, maxPriorityFeePerGas } = await calcFeeData(
          maxFeePerGas,
          maxPriorityFeePerGas
        ));

        maxFeePerGas = ethers.utils.parseUnits(maxFeePerGas, "gwei");
        maxPriorityFeePerGas = ethers.utils.parseUnits(
          maxPriorityFeePerGas,
          "gwei"
        );
        // - don't consider trading if spread cannot cover DEX fees
        if (!shouldConsiderTrade) return;

        /**
         * @async function to estimate gas to be used for transaction
         */
        // const gasLimit = BigNumber.from("350000");
        // const gasPrice = await this.wallet.getGasPrice();
        // const gasCost = gasLimit.mul(gasPrice);
        const shouldActuallyTrade =
          potentialProfitInAVAX > Number(ethers.utils.formatEther(maxFeePerGas));
        // ------------------------------------------------------------------------>

        // - don't trade if gasCost is higher than spread
        if (!shouldActuallyTrade) return;

        // Type 2 transaction is for EIP1559
        const bundledArbitrageTx = {
          type: 2,
          to: this.flashSwapAddress,
          data: iface.encodeFunctionData("flashSwap", [
            pangolinPairAddress,
            tokenToBorrow,
            ethers.utils.parseEther(`${volumeToBorrow}`).toString(),
          ]),
          maxFeePerGas,
          maxPriorityFeePerGas,
        };

        const newGasLimit = await this.web3Provider.estimateGas(
          bundledArbitrageTx
        );

        const signedTx = await this.wallet.signTransaction(bundledArbitrageTx);
        const txHash = ethers.utils.keccak256(signedTx);

        //console.log("Sending signed transaction");

        // Sending a signed transaction and waiting for its inclusion
        //await (await this.web3Provider.sendTransaction(signedTx)).wait();

        //console.log(
         // `View transaction with nonce ${nonce}: https://snowtrace.io/tx/${txHash}`
        //);

        
        const provider = new ethers.providers.JsonRpcProvider({
          url: process.env.C_CHAIN_NODE,
        });

        const authSigner = new ethers.Wallet(process.env.AUTH_SIGNER);
        const flashbotsProvider = await FlashbotsBundleProvider.create(
          provider,
          authSigner
        );

        const signedBundle = await flashbotsProvider.signBundle([
          {
            signer: authSigner,
            transaction: bundledArbitrageTx,
          },
        ]);

        const bundleReceipt = await flashbotsProvider.sendRawBundle(
          signedBundle,
          TARGET_BLOCK_NUMBER
        );
        // console.log(bundleReceipt);
      } catch (err) {
        console.log(new Error(err.message));
        setTimeout(() => (freeze = false), 5 * 1000); // 10 seconds freeze period if error occurs
      }
    });
  };

  /**
   * function for logging the price info of tokens from new blocks to the console
   * @param {String} token0Symbol - symbol of the first token
   * @param {String} token1Symbol - symbol of the second token
   * @param {Number} traderjoeRate - rate of the token pair from traderjoe_xyz DEX
   * @param {Number} pangolinRate - rate of the token pair from pangolin DEX
   * @param {Number} potentialProfit - profit after DEXes fees have been removed (does not take gas fee for transaction into account)
   * @param {String} borrowTokenSymbol - ticker symbol of the token that's to be borrowed from pangolin DEX
   * @param {Number} borrowVolume - amount of tokens to be borrowed
   * @param {String} returnTokenSymbol - ticker symbol of the token that's to be returned to pangolin DEX
   * @method taste
   */
  taste = (
    token0Symbol,
    token1Symbol,
    traderjoeRate,
    pangolinRate,
    potentialProfit,
    borrowTokenSymbol,
    borrowVolume,
    returnTokenSymbol,
    maxFeePerGas,
    maxPriorityFeePerGas,
    newGasLimit
  ) => {
    console.table([
      {
        Token0: token0Symbol,
        Token1: token1Symbol,
        "Trader Joe": traderjoeRate,
        Pangolin: pangolinRate,
        Borrow: `${borrowVolume.toLocaleString()} ${borrowTokenSymbol}`,
        "Potential Profit": `${potentialProfit.toLocaleString()} ${returnTokenSymbol}`,
        "gaslimit": newGasLimit,
        "mFPG": maxFeePerGas,
        "mPFPG": maxPriorityFeePerGas
      },
    ]);
  };

  /**
   * @async function for listening to events on the blockchain and raising those events on the server
   * @method serve
   */
  serve = async () => {
    this.FlashSwapContract.on("Trade", async (tokenAdress, profit) => {
      this.emit("trade", { token: tokenAdress, profit: profit });
    });

    this.FlashSwapContract.on("GasAdded", async (depositor, value) => {
      this.emit("gas-added", { by: depositor, amount: value });
    });

    this.FlashSwapContract.on("Withdraw", async (sender, amount) => {
      this.emit("withdrawal", { by: sender, amount: amount });
    });
  };

  /**
   * @async function to check the balance of flashswap contract
   * @method flourRemaining
   * @returns {Promise} resolves to the contract's balance
   */
  flourRemaining = async () => {
    return await this.FlashSwapContract.checkGas();
  };
}

module.exports = GingerBread;
