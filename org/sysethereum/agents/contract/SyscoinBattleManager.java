package org.sysethereum.agents.contract;

import io.reactivex.Flowable;
import io.reactivex.functions.Function;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.DynamicBytes;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.generated.Uint8;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.RemoteCall;
import org.web3j.protocol.core.RemoteFunctionCall;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.methods.response.BaseEventResponse;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.Contract;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.ContractGasProvider;

/**
 * <p>Auto generated code.
 * <p><strong>Do not modify!</strong>
 * <p>Please use the <a href="https://docs.web3j.io/command_line.html">web3j command line tools</a>,
 * or the org.web3j.codegen.SolidityFunctionWrapperGenerator in the 
 * <a href="https://github.com/web3j/web3j/tree/master/codegen">codegen module</a> to update.
 *
 * <p>Generated with web3j version 4.5.4.
 */
@SuppressWarnings("rawtypes")
public class SyscoinBattleManager extends Contract {
    private static final String BINARY = "0x608060405234801561001057600080fd5b506124ce806100206000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c8063795ea18e11610071578063795ea18e146101d8578063d1daeede146101f5578063df23ceb214610229578063e177321614610264578063f1afcfa614610281578063f871dfe814610289576100a9565b806318b011de146100ae5780633678c143146100c8578063455e6166146100f057806351fcf431146100f857806371a8c18a146101a7575b600080fd5b6100b66102a6565b60408051918252519081900360200190f35b6100ee600480360360208110156100de57600080fd5b50356001600160a01b03166102ac565b005b6100b6610303565b6100ee6004803603606081101561010e57600080fd5b8135919081019060408101602082013564010000000081111561013057600080fd5b82018360208201111561014257600080fd5b8035906020019184600183028401116401000000008311171561016457600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550509135925061030f915050565b6101c4600480360360208110156101bd57600080fd5b5035610771565b604080519115158252519081900360200190f35b6100b6600480360360208110156101ee57600080fd5b5035610791565b6100b66004803603606081101561020b57600080fd5b508035906001600160a01b0360208201358116916040013516610804565b6100ee6004803603608081101561023f57600080fd5b5060ff813516906001600160a01b03602082013516906040810135906060013561092b565b6101c46004803603602081101561027a57600080fd5b5035610a14565b6100b6610a34565b6100b66004803603602081101561029f57600080fd5b5035610a3a565b60355481565b60365461010090046001600160a01b03161580156102d257506001600160a01b03811615155b6102db57600080fd5b603680546001600160a01b0390921661010002610100600160a81b0319909216919091179055565b6729a2241af62c000081565b600083815260336020526040902060018101546001600160a01b031633811461033757600080fd5b6005820154600260365460ff16600281111561034f57fe5b146103875760028111158015610366575083601014155b8061037d575080600314801561037d575083600c14155b1561038757600080fd5b61038f6122e7565b835460375460408051636e5b707160e01b81526004810184905290516001600160a01b0390921691636e5b70719160248082019261012092909190829003018186803b1580156103de57600080fd5b505afa1580156103f2573d6000803e3d6000fd5b505050506040513d61012081101561040957600080fd5b50805160208083015160408085015160608087015160808089015160a08a0151610100909a015163ffffffff90811660e08e0152918c019990995290971660c08a0152888101969096528782015286830191909152918552815189815289820281019091019091526000919088801561048c578160200160208202803883390190505b5090506060886040519080825280602002602001820160405280156104cb57816020015b6104b8612331565b8152602001906001900390816104b05790505b5090506000805b825181101561060e576104e58c86610b23565b8382815181106104f157fe5b6020026020010181905250600061051e84838151811061050d57fe5b602002602001015160000151610b78565b905061052a8d87610b9b565b156105a257610537612358565b6105418e88610bbe565b9050818160000151111561055b576127a69350505061060e565b600061058186858151811061056c57fe5b60200260200101516060015160001c83610cbc565b90508060011461059557935061060e915050565b50610140015195506105d6565b808483815181106105af57fe5b60200260200101516060015160001c11156105cf5761279292505061060e565b8560500195505b8382815181106105e257fe5b6020026020010151606001518583815181106105fa57fe5b6020908102919091010152506001016104d2565b508015610641576002890154610633908d9087908b906001600160a01b031685610d2d565b50505050505050505061076c565b61066c898761064f86610e08565b8560018751038151811061065f57fe5b60200260200101516110c0565b90508015610697576002890154610692908d9087908b906001600160a01b031685610d2d565b610762565b4260038a01556106a8898784611226565b905080156106ce576002890154610633908d9087908b906001600160a01b031685610d2d565b89600c14806106ed5750600260365460ff1660028111156106eb57fe5b145b15610710576002890154610633908d9087908b906001600160a01b0316856115c7565b60408051868152602081018e905260018901818301526001600160a01b038a16606082015290517f0e660e6e65ec52c9dda40ab02165320c09e799891feae8fed08191cb2150b45b9181900360800190a15b5050505050505050505b505050565b60008181526033602052604090206035546003909101540142115b919050565b600081815260336020526040812060018101546001600160a01b03166107b657600080fd5b6035548160030154014211156107fa578054600182015460028301546107ef92869290916001600160a01b03918216911661c36a610d2d565b61c36a91505061078c565b5061c36e92915050565b60365460009061010090046001600160a01b031633811461082457600080fd5b60408051602080820188905233828401526001600160a01b0380871660608085019190915284518085039091018152608090930184528251928201929092206000818152603390925292902060018101549091161561088257600080fd5b8681556001810180546001600160a01b038089166001600160a01b0319928316179092556002830180549288169290911691909117905560006108c860058301826123b2565b5042600382015560408051888152602081018490526001600160a01b03808916828401528716606082015290517f403956bdc140717d54d4573786b4e9e773ef2e6e325e2c061476eb47711770de9181900360800190a15091505b509392505050565b600054610100900460ff168061094457506109446116a2565b80610952575060005460ff16155b61098d5760405162461bcd60e51b815260040180806020018281038252602e81526020018061246c602e913960400191505060405180910390fd5b600054610100900460ff161580156109b8576000805460ff1961ff0019909116610100171660011790555b6036805486919060ff191660018360028111156109d157fe5b0217905550603780546001600160a01b0319166001600160a01b038616179055603483905560358290558015610a0d576000805461ff00191690555b5050505050565b6000908152603360205260409020600101546001600160a01b0316151590565b60345481565b6000610a446123d6565b600083815260336020908152604091829020825160c0810184528154815260018201546001600160a01b03908116828501526002830154168185015260038201546060820152600482015460808201526005820180548551818602810186019096528086529194929360a08601939290830182828015610ae357602002820191906000526020600020905b815481526020019060010190808311610acf575b5050509190925250505060208101519091506001600160a01b0316610b0c57600091505061078c565b505060009081526033602052604090206005015490565b610b2b612331565b610b3583836116a9565b63ffffffff168152610b49838360506116b8565b6060820152610b588383611773565b63ffffffff166040820152610b6d8383611782565b602082015292915050565b62ffffff8116630100000063ffffffff92831604909116600219016101000a0290565b6000610100610baa84846117a2565b1663ffffffff166000141590505b92915050565b610bc6612358565b60606000605084019350610bda85856117de565b92509050610beb85858084036116b8565b60208085019190915281019350610c048585600061180a565b60e08501919091529350610c1a858560206118ba565b61010084015260049390930192610c338585600061180a565b60608501919091529350610c49858560206118ba565b608084015260049390930192610c61858560506116b8565b835260249390930192610c7485856118f4565b60c084015260289390930192610c8c858560206118ba565b610120840152600484016101408401526000610ca7836118fc565b60a08701525060408501525091949350505050565b6000816101000151600014610cd4575061274c610bb8565b8160a00151600114610ceb575060a0810151610bb8565b8160400151610cfa84846119c5565b14610d08575061277e610bb8565b8160c00151610d16836119da565b14610d245750612788610bb8565b50600192915050565b60365460408051633a45007160e11b815260048101889052602481018790526001600160a01b038581166044830152868116606483015291516101009093049091169163748a00e29160848082019260009290919082900301818387803b158015610d9757600080fd5b505af1158015610dab573d6000803e3d6000fd5b505060408051878152602081018990528082018590526001600160a01b038716606082015290517fae4f7410342e27aa0df7167c691dfd96c5d906aff82fbe0279985e0cf48be5e39350908190036080019150a1610a0d856119f7565b80516000906001811415610e335782600081518110610e2357fe5b602002602001015191505061078c565b60008111610e7e576040805162461bcd60e51b81526020600482015260136024820152724d7573742070726f766964652068617368657360681b604482015290519081900360640190fd5b60005b81811015610eca57610ea8848281518110610e9857fe5b602002602001015160001c611a44565b60001b848281518110610eb757fe5b6020908102919091010152600101610e81565b6000805b60018411156110a6575060009150815b8383101561109e57838360010110610ef95760018403610efe565b826001015b9150600280878581518110610f0f57fe5b6020026020010151888581518110610f2357fe5b602002602001015160405160200180838152602001828152602001925050506040516020818303038152906040526040518082805190602001908083835b60208310610f805780518252601f199092019160209182019101610f61565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa158015610fbf573d6000803e3d6000fd5b5050506040513d6020811015610fd457600080fd5b50516040805160208181019390935281518082038401815290820191829052805190928291908401908083835b602083106110205780518252601f199092019160209182019101611001565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa15801561105f573d6000803e3d6000fd5b5050506040513d602081101561107457600080fd5b5051865187908390811061108457fe5b602090810291909101015260029290920191600101610ede565b809350610ece565b6110b686600081518110610e9857fe5b9695505050505050565b6005840154600090600314806110e65750600260365460ff1660028111156110e457fe5b145b156111ff576060600260365460ff16600281111561110057fe5b141561110d576001611110565b60045b60ff1660405190808252806020026020018201604052801561113c578160200160208202803883390190505b50905060005b60058701548110156111875786600501818154811061115d57fe5b906000526020600020015482828151811061117457fe5b6020908102919091010152600101611142565b8482828151811061119457fe5b6020026020010181815250506111a982610e08565b8651146111bc5761c3769250505061121e565b836040015163ffffffff168660200151146111dd5761c3749250505061121e565b85606001518460600151146111f85761c38b9250505061121e565b505061121a565b60058501805460018101825560009182526020909120018390555b5060005b949350505050565b60006112306122e7565b611238612331565b8360018551038151811061124857fe5b60200260200101519050603760009054906101000a90046001600160a01b03166001600160a01b0316636e5b707186608001516040518263ffffffff1660e01b8152600401808281526020019150506101206040518083038186803b1580156112b057600080fd5b505afa1580156112c4573d6000803e3d6000fd5b505050506040513d6101208110156112db57600080fd5b5060408082015160608084015160809094015163ffffffff1660c0870152850192909252830152600586015460011061133d5781606001518460008151811061132057fe5b6020026020010151602001511461133d5761c38d925050506115c0565b600061134e87868560c00151611b6e565b905080156113605792506115c0915050565b8451600c1461137857606082015160048801556115b8565b600061138386611c92565b90508660400151811461139e5761c3979450505050506115c0565b836040015181116113b75761c3989450505050506115c0565b600260365460ff1660028111156113ca57fe5b146115b657600660018860e001510363ffffffff16816113e657fe5b0663ffffffff1660001415611564576113fd612331565b8660028851038151811061140d57fe5b60209081029190910181015160375460e08b01516040805163c0dde98b60e01b815260051990920163ffffffff166004830152519294506001600160a01b0390911692632da8cffd92849263c0dde98b926024808301939192829003018186803b15801561147a57600080fd5b505afa15801561148e573d6000803e3d6000fd5b505050506040513d60208110156114a457600080fd5b5051604080516001600160e01b031960e085901b1681526004810192909252516024808301926020929190829003018186803b1580156114e357600080fd5b505afa1580156114f7573d6000803e3d6000fd5b505050506040513d602081101561150d57600080fd5b505160208901819052604082015160c08701516000926115349263ffffffff160390611cf6565b90508063ffffffff168960c0015163ffffffff161461155d5761c38996505050505050506115c0565b505061158d565b8360c0015163ffffffff168760c0015163ffffffff161461158d5761c3909450505050506115c0565b826000015163ffffffff168760c0015163ffffffff16146115b65761c3909450505050506115c0565b505b600093505050505b9392505050565b60365460408051633a45007160e11b815260048101889052602481018790526001600160a01b038681166044830152858116606483015291516101009093049091169163748a00e29160848082019260009290919082900301818387803b15801561163157600080fd5b505af1158015611645573d6000803e3d6000fd5b505060408051878152602081018990528082018590526001600160a01b038616606082015290517f766980202352ff259a9ea889942266c29c1ca6260254f21cd529af44aeb5637c9350908190036080019150a1610a0d856119f7565b303b155b90565b60006115c083836048016117a2565b600061121e60026116ca868686611d51565b604051602001808281526020019150506040516020818303038152906040526040518082805190602001908083835b602083106117185780518252601f1990920191602091820191016116f9565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa158015611757573d6000803e3d6000fd5b5050506040513d602081101561176c57600080fd5b5051611a44565b60006115c083836044016117a2565b602482820101516000906004830161179982611a44565b95945050505050565b6000816020840101516040518160031a60008201538160021a60018201538160011a60028201538160001a60038201535160e01c949350505050565b600060606117ef8484600401611d76565b90925090506117fe8483611dfe565b60040194909350915050565b6060600080600061181b8787611e51565b9650915084158061182b57508185115b1561183757508061183a565b50835b606081604051908082528060200260200182016040528015611866578160200160208202803883390190505b50905060005b828110156118ae576118866118818a8a6118f4565b611a44565b82828151811061189257fe5b602090810291909101810191909152979097019660010161186c565b50979596505050505050565b6000805b60088304811015610923578060080260020a85828601815181106118de57fe5b016020015160f81c0291909101906001016118be565b016020015190565b6000806000806000809050600063fabe6d6d60e01b905060006001600160e01b031990508751602089018181015b8082101561195f5784848351161415611954578561194d57600482820384030196505b6001860195505b60018201915061192a565b50505060028310611981575060009550505060031901915061276090506119be565b82600114156119ab5761199488856118f4565b9650506003199092019350600192506119be915050565b5060009550505060031901915061276a90505b9193909250565b60006115c08383608001518460600151611f03565b6000610bb861188183602001518461010001518560e00151611f03565b60008181526033602052604081208181556001810180546001600160a01b0319908116909155600282018054909116905560038101829055600481018290559061076c600583018261240d565b60405160009060ff8316815382601e1a600182015382601d1a600282015382601c1a600382015382601b1a600482015382601a1a60058201538260191a60068201538260181a60078201538260171a60088201538260161a60098201538260151a600a8201538260141a600b8201538260131a600c8201538260121a600d8201538260111a600e8201538260101a600f82015382600f1a601082015382600e1a601182015382600d1a601282015382600c1a601382015382600b1a601482015382600a1a60158201538260091a60168201538260081a60178201538260071a60188201538260061a60198201538260051a601a8201538260041a601b8201538260031a601c8201538260021a601d8201538260011a601e8201538260001a601f8201535192915050565b8151600090600019015b8015611c1b57611b86612331565b848281518110611b9257fe5b60200260200101519050611ba4612331565b856001840381518110611bb357fe5b602002602001015190508551600c141580611bd15750600186510383105b15611bf457815163ffffffff868116911614611bf45761c38a93505050506115c0565b8160200151816060015114611c105761c38c93505050506115c0565b505060001901611b78565b5082600081518110611c2957fe5b60200260200101516000015163ffffffff168263ffffffff1614611c50575061c38a6115c0565b6005840154600211611c885782600081518110611c6957fe5b602002602001015160200151846004015414611c88575061c3936115c0565b5060009392505050565b6000611c9c61242e565b60005b600b811015611ce257838160010181518110611cb757fe5b60200260200101516040015163ffffffff168282600b8110611cd557fe5b6020020152600101611c9f565b50611cec8161211d565b60a0015192915050565b600082614380811015611d0c5750614380611d1b565b616978811115611d1b57506169785b6000611d2684610b78565b6154609083020490506001600160ec1b03811115611d4857506001600160ec1b035b611799816121bf565b60006040516020818486602089010160025afa611d6d57600080fd5b51949350505050565b60006060600080611d878686611e51565b9550915081611db757611d9a8686611e51565b9550915081611da857600080fd5b611db28686611e51565b955091505b81600114611dc457600080fd5b602485019450611dd48686611e51565b955090506060611de78787848101612250565b9590910160040194859450925050505b9250929050565b6000806000611e0d8585611e51565b94509150600a8210611e1e57600080fd5b60005b82811015611e4757600885019450611e398686611e51565b810195509150600101611e21565b5092949350505050565b6000806000848481518110611e6257fe5b01602001516001949094019360f81c905060fd811015611e895760ff169150829050611df7565b8060ff1660fd1415611eaf57611ea1858560106118ba565b846002019250925050611df7565b8060ff1660fe1415611ed557611ec7858560206118ba565b846004019250925050611df7565b8060ff1660ff1415611efb57611eed858560406118ba565b846008019250925050611df7565b509250929050565b8051600090815b81811015611f4d57611f2e848281518110611f2157fe5b6020026020010151611a44565b848281518110611f3a57fe5b6020908102919091010152600101611f0a565b50600080611f5a87611a44565b90505b82821015612109576000858381518110611f7357fe5b6020026020010151905060008060028981611f8a57fe5b0660011415611f9d575081905082611fa3565b50829050815b600280838360405160200180838152602001828152602001925050506040516020818303038152906040526040518082805190602001908083835b60208310611ffd5780518252601f199092019160209182019101611fde565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa15801561203c573d6000803e3d6000fd5b5050506040513d602081101561205157600080fd5b50516040805160208181019390935281518082038401815290820191829052805190928291908401908083835b6020831061209d5780518252601f19909201916020918201910161207e565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa1580156120dc573d6000803e3d6000fd5b5050506040513d60208110156120f157600080fd5b50519350600289049850600185019450505050611f5d565b61211281611a44565b979650505050505050565b60005b600b8110156121bb57600181015b600b8110156121b2578281600b811061214357fe5b60200201518383600b811061215457fe5b602002015111156121aa5760008383600b811061216d57fe5b602002015190508382600b811061218057fe5b60200201518484600b811061219157fe5b6020020152808483600b81106121a357fe5b6020020152505b60010161212e565b50600101612120565b5050565b6000806121d86121ce846122a2565b60070160036122ca565b9050600060038211612200576121f98462ffffff16836003036008026122e0565b9050612218565b61221084600384036008026122ca565b62ffffff1690505b6280000081161561223d576122348163ffffffff1660086122ca565b90506001820191505b6122488260186122e0565b179392505050565b6060600083830390506060816040519080825280601f01601f191660200182016040528015612286576020820181803883390190505b5090508160208201838760208a010160045afa61179957600080fd5b6000815b80156122c4576122b78160016122ca565b90506001820191506122a6565b50919050565b60008160020a83816122d857fe5b049392505050565b60020a0290565b6040805161012081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e081018290529061010082015290565b60408051608081018252600080825260208201819052918101829052606081019190915290565b60405180610160016040528060008152602001600081526020016000815260200160608152602001600081526020016000815260200160008152602001606081526020016000815260200160008152602001600081525090565b81548183558181111561076c5760008381526020902061076c91810190830161244d565b6040805160c0810182526000808252602082018190529181018290526060808201839052608082019290925260a081019190915290565b508054600082559060005260206000209081019061242b919061244d565b50565b604051806101600160405280600b906020820280388339509192915050565b6116a691905b808211156124675760008155600101612453565b509056fe436f6e747261637420696e7374616e63652068617320616c7265616479206265656e20696e697469616c697a6564a265627a7a723158204cceff20a5c8fbc106692ffa25994ae07793cf780736d5659e1c4e296aedcc3f64736f6c634300050c0032";

    public static final String FUNC_MINPROPOSALDEPOSIT = "minProposalDeposit";

    public static final String FUNC_SUPERBLOCKDURATION = "superblockDuration";

    public static final String FUNC_SUPERBLOCKTIMEOUT = "superblockTimeout";

    public static final String FUNC_INIT = "init";

    public static final String FUNC_SETSYSCOINCLAIMMANAGER = "setSyscoinClaimManager";

    public static final String FUNC_BEGINBATTLESESSION = "beginBattleSession";

    public static final String FUNC_RESPONDBLOCKHEADERS = "respondBlockHeaders";

    public static final String FUNC_TIMEOUT = "timeout";

    public static final String FUNC_GETSUBMITTERHITTIMEOUT = "getSubmitterHitTimeout";

    public static final String FUNC_GETNUMMERKLEHASHESBYSESSION = "getNumMerkleHashesBySession";

    public static final String FUNC_SESSIONEXISTS = "sessionExists";

    public static final Event CHALLENGERCONVICTED_EVENT = new Event("ChallengerConvicted", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Bytes32>() {}, new TypeReference<Uint256>() {}, new TypeReference<Address>() {}));
    ;

    public static final Event NEWBATTLE_EVENT = new Event("NewBattle", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Bytes32>() {}, new TypeReference<Address>() {}, new TypeReference<Address>() {}));
    ;

    public static final Event RESPONDBLOCKHEADERS_EVENT = new Event("RespondBlockHeaders", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Bytes32>() {}, new TypeReference<Uint256>() {}, new TypeReference<Address>() {}));
    ;

    public static final Event SUBMITTERCONVICTED_EVENT = new Event("SubmitterConvicted", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Bytes32>() {}, new TypeReference<Uint256>() {}, new TypeReference<Address>() {}));
    ;

    protected static final HashMap<String, String> _addresses;

    static {
        _addresses = new HashMap<String, String>();
        _addresses.put("4", "0x8eE2791CD3b2D0224885b89208C3E60b1C3c876C");
    }

    @Deprecated
    protected SyscoinBattleManager(String contractAddress, Web3j web3j, Credentials credentials, BigInteger gasPrice, BigInteger gasLimit) {
        super(BINARY, contractAddress, web3j, credentials, gasPrice, gasLimit);
    }

    protected SyscoinBattleManager(String contractAddress, Web3j web3j, Credentials credentials, ContractGasProvider contractGasProvider) {
        super(BINARY, contractAddress, web3j, credentials, contractGasProvider);
    }

    @Deprecated
    protected SyscoinBattleManager(String contractAddress, Web3j web3j, TransactionManager transactionManager, BigInteger gasPrice, BigInteger gasLimit) {
        super(BINARY, contractAddress, web3j, transactionManager, gasPrice, gasLimit);
    }

    protected SyscoinBattleManager(String contractAddress, Web3j web3j, TransactionManager transactionManager, ContractGasProvider contractGasProvider) {
        super(BINARY, contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public List<ChallengerConvictedEventResponse> getChallengerConvictedEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(CHALLENGERCONVICTED_EVENT, transactionReceipt);
        ArrayList<ChallengerConvictedEventResponse> responses = new ArrayList<ChallengerConvictedEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            ChallengerConvictedEventResponse typedResponse = new ChallengerConvictedEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.sessionId = (Bytes32) eventValues.getNonIndexedValues().get(1);
            typedResponse.err = (Uint256) eventValues.getNonIndexedValues().get(2);
            typedResponse.challenger = (Address) eventValues.getNonIndexedValues().get(3);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<ChallengerConvictedEventResponse> challengerConvictedEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, ChallengerConvictedEventResponse>() {
            @Override
            public ChallengerConvictedEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(CHALLENGERCONVICTED_EVENT, log);
                ChallengerConvictedEventResponse typedResponse = new ChallengerConvictedEventResponse();
                typedResponse.log = log;
                typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.sessionId = (Bytes32) eventValues.getNonIndexedValues().get(1);
                typedResponse.err = (Uint256) eventValues.getNonIndexedValues().get(2);
                typedResponse.challenger = (Address) eventValues.getNonIndexedValues().get(3);
                return typedResponse;
            }
        });
    }

    public Flowable<ChallengerConvictedEventResponse> challengerConvictedEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(CHALLENGERCONVICTED_EVENT));
        return challengerConvictedEventFlowable(filter);
    }

    public List<NewBattleEventResponse> getNewBattleEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(NEWBATTLE_EVENT, transactionReceipt);
        ArrayList<NewBattleEventResponse> responses = new ArrayList<NewBattleEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            NewBattleEventResponse typedResponse = new NewBattleEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.sessionId = (Bytes32) eventValues.getNonIndexedValues().get(1);
            typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(2);
            typedResponse.challenger = (Address) eventValues.getNonIndexedValues().get(3);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<NewBattleEventResponse> newBattleEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, NewBattleEventResponse>() {
            @Override
            public NewBattleEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(NEWBATTLE_EVENT, log);
                NewBattleEventResponse typedResponse = new NewBattleEventResponse();
                typedResponse.log = log;
                typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.sessionId = (Bytes32) eventValues.getNonIndexedValues().get(1);
                typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(2);
                typedResponse.challenger = (Address) eventValues.getNonIndexedValues().get(3);
                return typedResponse;
            }
        });
    }

    public Flowable<NewBattleEventResponse> newBattleEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(NEWBATTLE_EVENT));
        return newBattleEventFlowable(filter);
    }

    public List<RespondBlockHeadersEventResponse> getRespondBlockHeadersEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(RESPONDBLOCKHEADERS_EVENT, transactionReceipt);
        ArrayList<RespondBlockHeadersEventResponse> responses = new ArrayList<RespondBlockHeadersEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            RespondBlockHeadersEventResponse typedResponse = new RespondBlockHeadersEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.sessionId = (Bytes32) eventValues.getNonIndexedValues().get(1);
            typedResponse.merkleHashCount = (Uint256) eventValues.getNonIndexedValues().get(2);
            typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(3);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<RespondBlockHeadersEventResponse> respondBlockHeadersEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, RespondBlockHeadersEventResponse>() {
            @Override
            public RespondBlockHeadersEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(RESPONDBLOCKHEADERS_EVENT, log);
                RespondBlockHeadersEventResponse typedResponse = new RespondBlockHeadersEventResponse();
                typedResponse.log = log;
                typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.sessionId = (Bytes32) eventValues.getNonIndexedValues().get(1);
                typedResponse.merkleHashCount = (Uint256) eventValues.getNonIndexedValues().get(2);
                typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(3);
                return typedResponse;
            }
        });
    }

    public Flowable<RespondBlockHeadersEventResponse> respondBlockHeadersEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(RESPONDBLOCKHEADERS_EVENT));
        return respondBlockHeadersEventFlowable(filter);
    }

    public List<SubmitterConvictedEventResponse> getSubmitterConvictedEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(SUBMITTERCONVICTED_EVENT, transactionReceipt);
        ArrayList<SubmitterConvictedEventResponse> responses = new ArrayList<SubmitterConvictedEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            SubmitterConvictedEventResponse typedResponse = new SubmitterConvictedEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.sessionId = (Bytes32) eventValues.getNonIndexedValues().get(1);
            typedResponse.err = (Uint256) eventValues.getNonIndexedValues().get(2);
            typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(3);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<SubmitterConvictedEventResponse> submitterConvictedEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, SubmitterConvictedEventResponse>() {
            @Override
            public SubmitterConvictedEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(SUBMITTERCONVICTED_EVENT, log);
                SubmitterConvictedEventResponse typedResponse = new SubmitterConvictedEventResponse();
                typedResponse.log = log;
                typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.sessionId = (Bytes32) eventValues.getNonIndexedValues().get(1);
                typedResponse.err = (Uint256) eventValues.getNonIndexedValues().get(2);
                typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(3);
                return typedResponse;
            }
        });
    }

    public Flowable<SubmitterConvictedEventResponse> submitterConvictedEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(SUBMITTERCONVICTED_EVENT));
        return submitterConvictedEventFlowable(filter);
    }

    public RemoteFunctionCall<Uint256> minProposalDeposit() {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_MINPROPOSALDEPOSIT, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Uint256> superblockDuration() {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_SUPERBLOCKDURATION, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Uint256> superblockTimeout() {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_SUPERBLOCKTIMEOUT, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<TransactionReceipt> init(Uint8 _network, Address _superblocks, Uint256 _superblockDuration, Uint256 _superblockTimeout) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_INIT, 
                Arrays.<Type>asList(_network, _superblocks, _superblockDuration, _superblockTimeout), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> setSyscoinClaimManager(Address _syscoinClaimManager) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_SETSYSCOINCLAIMMANAGER, 
                Arrays.<Type>asList(_syscoinClaimManager), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> beginBattleSession(Bytes32 superblockHash, Address submitter, Address challenger) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_BEGINBATTLESESSION, 
                Arrays.<Type>asList(superblockHash, submitter, challenger), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> respondBlockHeaders(Bytes32 sessionId, DynamicBytes blockHeaders, Uint256 numHeaders) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_RESPONDBLOCKHEADERS, 
                Arrays.<Type>asList(sessionId, blockHeaders, numHeaders), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> timeout(Bytes32 sessionId) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_TIMEOUT, 
                Arrays.<Type>asList(sessionId), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<Bool> getSubmitterHitTimeout(Bytes32 sessionId) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETSUBMITTERHITTIMEOUT, 
                Arrays.<Type>asList(sessionId), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Uint256> getNumMerkleHashesBySession(Bytes32 sessionId) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETNUMMERKLEHASHESBYSESSION, 
                Arrays.<Type>asList(sessionId), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Bool> sessionExists(Bytes32 sessionId) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_SESSIONEXISTS, 
                Arrays.<Type>asList(sessionId), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    @Deprecated
    public static SyscoinBattleManager load(String contractAddress, Web3j web3j, Credentials credentials, BigInteger gasPrice, BigInteger gasLimit) {
        return new SyscoinBattleManager(contractAddress, web3j, credentials, gasPrice, gasLimit);
    }

    @Deprecated
    public static SyscoinBattleManager load(String contractAddress, Web3j web3j, TransactionManager transactionManager, BigInteger gasPrice, BigInteger gasLimit) {
        return new SyscoinBattleManager(contractAddress, web3j, transactionManager, gasPrice, gasLimit);
    }

    public static SyscoinBattleManager load(String contractAddress, Web3j web3j, Credentials credentials, ContractGasProvider contractGasProvider) {
        return new SyscoinBattleManager(contractAddress, web3j, credentials, contractGasProvider);
    }

    public static SyscoinBattleManager load(String contractAddress, Web3j web3j, TransactionManager transactionManager, ContractGasProvider contractGasProvider) {
        return new SyscoinBattleManager(contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public static RemoteCall<SyscoinBattleManager> deploy(Web3j web3j, Credentials credentials, ContractGasProvider contractGasProvider) {
        return deployRemoteCall(SyscoinBattleManager.class, web3j, credentials, contractGasProvider, BINARY, "");
    }

    @Deprecated
    public static RemoteCall<SyscoinBattleManager> deploy(Web3j web3j, Credentials credentials, BigInteger gasPrice, BigInteger gasLimit) {
        return deployRemoteCall(SyscoinBattleManager.class, web3j, credentials, gasPrice, gasLimit, BINARY, "");
    }

    public static RemoteCall<SyscoinBattleManager> deploy(Web3j web3j, TransactionManager transactionManager, ContractGasProvider contractGasProvider) {
        return deployRemoteCall(SyscoinBattleManager.class, web3j, transactionManager, contractGasProvider, BINARY, "");
    }

    @Deprecated
    public static RemoteCall<SyscoinBattleManager> deploy(Web3j web3j, TransactionManager transactionManager, BigInteger gasPrice, BigInteger gasLimit) {
        return deployRemoteCall(SyscoinBattleManager.class, web3j, transactionManager, gasPrice, gasLimit, BINARY, "");
    }

    protected String getStaticDeployedAddress(String networkId) {
        return _addresses.get(networkId);
    }

    public static String getPreviouslyDeployedAddress(String networkId) {
        return _addresses.get(networkId);
    }

    public static class ChallengerConvictedEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Bytes32 sessionId;

        public Uint256 err;

        public Address challenger;
    }

    public static class NewBattleEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Bytes32 sessionId;

        public Address submitter;

        public Address challenger;
    }

    public static class RespondBlockHeadersEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Bytes32 sessionId;

        public Uint256 merkleHashCount;

        public Address submitter;
    }

    public static class SubmitterConvictedEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Bytes32 sessionId;

        public Uint256 err;

        public Address submitter;
    }
}
