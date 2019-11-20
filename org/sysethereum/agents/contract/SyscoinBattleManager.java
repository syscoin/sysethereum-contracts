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
    private static final String BINARY = "0x608060405234801561001057600080fd5b506124c8806100206000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c8063795ea18e11610071578063795ea18e146101d8578063d1daeede146101f5578063df23ceb214610229578063e177321614610264578063f1afcfa614610281578063f871dfe814610289576100a9565b806318b011de146100ae5780633678c143146100c8578063455e6166146100f057806351fcf431146100f857806371a8c18a146101a7575b600080fd5b6100b66102a6565b60408051918252519081900360200190f35b6100ee600480360360208110156100de57600080fd5b50356001600160a01b03166102ac565b005b6100b6610303565b6100ee6004803603606081101561010e57600080fd5b8135919081019060408101602082013564010000000081111561013057600080fd5b82018360208201111561014257600080fd5b8035906020019184600183028401116401000000008311171561016457600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550509135925061030f915050565b6101c4600480360360208110156101bd57600080fd5b503561075b565b604080519115158252519081900360200190f35b6100b6600480360360208110156101ee57600080fd5b503561077b565b6100ee6004803603606081101561020b57600080fd5b508035906001600160a01b036020820135811691604001351661086c565b6100ee6004803603608081101561023f57600080fd5b5060ff813516906001600160a01b03602082013516906040810135906060013561093e565b6101c46004803603602081101561027a57600080fd5b5035610a27565b6100b6610a44565b6100b66004803603602081101561029f57600080fd5b5035610a4a565b60355481565b60365461010090046001600160a01b03161580156102d257506001600160a01b03811615155b6102db57600080fd5b603680546001600160a01b0390921661010002610100600160a81b0319909216919091179055565b6729a2241af62c000081565b600083815260336020526040902080546001600160a01b031633811461033457600080fd5b6004820154600260365460ff16600281111561034c57fe5b146103845760028111158015610363575083601014155b8061037a575080600314801561037a575083600c14155b1561038457600080fd5b61038c6122d4565b60375460408051636e5b707160e01b8152600481018a905290516001600160a01b0390921691636e5b70719160248082019261012092909190829003018186803b1580156103d957600080fd5b505afa1580156103ed573d6000803e3d6000fd5b505050506040513d61012081101561040457600080fd5b50805160208083015160408085015160608087015160808089015160a08a0151610100909a015163ffffffff90811660e08d0152918b019990995290971660c08901528781019690965286820152858301919091529184528151888152888202810190910190915260009190878015610487578160200160208202803883390190505b5090506060876040519080825280602002602001820160405280156104c657816020015b6104b361231e565b8152602001906001900390816104ab5790505b5090506000805b8251811015610609576104e08b86610b26565b8382815181106104ec57fe5b6020026020010181905250600061051984838151811061050857fe5b602002602001015160000151610b7b565b90506105258c87610b9e565b1561059d57610532612345565b61053c8d88610bc1565b90508181600001511115610556576127a693505050610609565b600061057c86858151811061056757fe5b60200260200101516060015160001c83610cbf565b905080600114610590579350610609915050565b50610140015195506105d1565b808483815181106105aa57fe5b60200260200101516060015160001c11156105ca57612792925050610609565b8560500195505b8382815181106105dd57fe5b6020026020010151606001518583815181106105f557fe5b6020908102919091010152506001016104cd565b50801561063957600188015461062c908c9089906001600160a01b031684610d30565b5050505050505050610756565b610664888661064786610e03565b8560018751038151811061065757fe5b60200260200101516110bb565b9050801561068d576001880154610688908c9089906001600160a01b031684610d30565b61074d565b42600289015561069e888684611221565b905080156106c257600188015461062c908c9089906001600160a01b031684610d30565b88600c14806106e15750600260365460ff1660028111156106df57fe5b145b1561070257600188015461062c908c9089906001600160a01b0316846115c2565b604080518c81526001880160208201526001600160a01b0389168183015290517fbb00dcdc614e6421b964f0ebca4d1ce96e2a575d555e09012e6f36ed405b410a9181900360600190a15b50505050505050505b505050565b60008181526033602052604090206035546002909101540142115b919050565b600081815260336020526040812080546001600160a01b031661079d57600080fd5b60355481600201540142111561086257805460018201546107cf9185916001600160a01b03918216911661c36a610d30565b603660019054906101000a90046001600160a01b03166001600160a01b0316633352f1a4846040518263ffffffff1660e01b815260040180828152602001915050602060405180830381600087803b15801561082a57600080fd5b505af115801561083e573d6000803e3d6000fd5b505050506040513d602081101561085457600080fd5b5061c36a9250610776915050565b5061c36e92915050565b60365461010090046001600160a01b031633811461088957600080fd5b600084815260336020526040902080546001600160a01b0316156108ac57600080fd5b80546001600160a01b038086166001600160a01b03199283161783556001830180549186169190921617905560006108e7600483018261239f565b50426002820155604080518681526001600160a01b03808716602083015285168183015290517f3726b144f253954160bd0bb1f002a28f904f6e83596cbb62e9e1f2082644ca939181900360600190a15050505050565b600054610100900460ff1680610957575061095761168f565b80610965575060005460ff16155b6109a05760405162461bcd60e51b815260040180806020018281038252602e815260200180612466602e913960400191505060405180910390fd5b600054610100900460ff161580156109cb576000805460ff1961ff0019909116610100171660011790555b6036805486919060ff191660018360028111156109e457fe5b0217905550603780546001600160a01b0319166001600160a01b038616179055603483905560358290558015610a20576000805461ff00191690555b5050505050565b6000908152603360205260409020546001600160a01b0316151590565b60345481565b6000610a546123c3565b600083815260336020908152604091829020825160a08101845281546001600160a01b03908116825260018301541681840152600282015481850152600382015460608201526004820180548551818602810186019096528086529194929360808601939290830182828015610ae957602002820191906000526020600020905b815481526020019060010190808311610ad5575b5050509190925250508151919250506001600160a01b0316610b0f576000915050610776565b505060009081526033602052604090206004015490565b610b2e61231e565b610b388383611696565b63ffffffff168152610b4c838360506116a5565b6060820152610b5b8383611760565b63ffffffff166040820152610b70838361176f565b602082015292915050565b62ffffff8116630100000063ffffffff92831604909116600219016101000a0290565b6000610100610bad848461178f565b1663ffffffff166000141590505b92915050565b610bc9612345565b60606000605084019350610bdd85856117cb565b92509050610bee85858084036116a5565b60208085019190915281019350610c07858560006117f7565b60e08501919091529350610c1d858560206118a7565b61010084015260049390930192610c36858560006117f7565b60608501919091529350610c4c858560206118a7565b608084015260049390930192610c64858560506116a5565b835260249390930192610c7785856118e9565b60c084015260289390930192610c8f858560206118a7565b610120840152600484016101408401526000610caa836118f1565b60a08701525060408501525091949350505050565b6000816101000151600014610cd7575061274c610bbb565b8160a00151600114610cee575060a0810151610bbb565b8160400151610cfd84846119ba565b14610d0b575061277e610bbb565b8160c00151610d19836119cf565b14610d275750612788610bbb565b50600192915050565b6036546040805163a4cbce7b60e01b8152600481018790526001600160a01b038581166024830152868116604483015291516101009093049091169163a4cbce7b9160648082019260009290919082900301818387803b158015610d9357600080fd5b505af1158015610da7573d6000803e3d6000fd5b505060408051878152602081018590526001600160a01b0387168183015290517fcc11926aca009e381b48e432fbfb8e3f192d5d8be733dc474fa78831bbfdf0449350908190036060019150a1610dfd846119ec565b50505050565b80516000906001811415610e2e5782600081518110610e1e57fe5b6020026020010151915050610776565b60008111610e79576040805162461bcd60e51b81526020600482015260136024820152724d7573742070726f766964652068617368657360681b604482015290519081900360640190fd5b60005b81811015610ec557610ea3848281518110610e9357fe5b602002602001015160001c611a31565b60001b848281518110610eb257fe5b6020908102919091010152600101610e7c565b6000805b60018411156110a1575060009150815b8383101561109957838360010110610ef45760018403610ef9565b826001015b9150600280878581518110610f0a57fe5b6020026020010151888581518110610f1e57fe5b602002602001015160405160200180838152602001828152602001925050506040516020818303038152906040526040518082805190602001908083835b60208310610f7b5780518252601f199092019160209182019101610f5c565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa158015610fba573d6000803e3d6000fd5b5050506040513d6020811015610fcf57600080fd5b50516040805160208181019390935281518082038401815290820191829052805190928291908401908083835b6020831061101b5780518252601f199092019160209182019101610ffc565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa15801561105a573d6000803e3d6000fd5b5050506040513d602081101561106f57600080fd5b5051865187908390811061107f57fe5b602090810291909101015260029290920191600101610ed9565b809350610ec9565b6110b186600081518110610e9357fe5b9695505050505050565b6004840154600090600314806110e15750600260365460ff1660028111156110df57fe5b145b156111fa576060600260365460ff1660028111156110fb57fe5b141561110857600161110b565b60045b60ff16604051908082528060200260200182016040528015611137578160200160208202803883390190505b50905060005b60048701548110156111825786600401818154811061115857fe5b906000526020600020015482828151811061116f57fe5b602090810291909101015260010161113d565b8482828151811061118f57fe5b6020026020010181815250506111a482610e03565b8651146111b75761c37692505050611219565b836040015163ffffffff168660200151146111d85761c37492505050611219565b85606001518460600151146111f35761c38b92505050611219565b5050611215565b60048501805460018101825560009182526020909120018390555b5060005b949350505050565b600061122b6122d4565b61123361231e565b8360018551038151811061124357fe5b60200260200101519050603760009054906101000a90046001600160a01b03166001600160a01b0316636e5b707186608001516040518263ffffffff1660e01b8152600401808281526020019150506101206040518083038186803b1580156112ab57600080fd5b505afa1580156112bf573d6000803e3d6000fd5b505050506040513d6101208110156112d657600080fd5b5060408082015160608084015160809094015163ffffffff1660c087015285019290925283015260048601546001106113385781606001518460008151811061131b57fe5b602002602001015160200151146113385761c38d925050506115bb565b600061134987868560c00151611b5b565b9050801561135b5792506115bb915050565b8451600c1461137357606082015160038801556115b3565b600061137e86611c7f565b9050866040015181146113995761c3979450505050506115bb565b836040015181116113b25761c3989450505050506115bb565b600260365460ff1660028111156113c557fe5b146115b157600660018860e001510363ffffffff16816113e157fe5b0663ffffffff166000141561155f576113f861231e565b8660028851038151811061140857fe5b60209081029190910181015160375460e08b01516040805163c0dde98b60e01b815260051990920163ffffffff166004830152519294506001600160a01b0390911692632da8cffd92849263c0dde98b926024808301939192829003018186803b15801561147557600080fd5b505afa158015611489573d6000803e3d6000fd5b505050506040513d602081101561149f57600080fd5b5051604080516001600160e01b031960e085901b1681526004810192909252516024808301926020929190829003018186803b1580156114de57600080fd5b505afa1580156114f2573d6000803e3d6000fd5b505050506040513d602081101561150857600080fd5b505160208901819052604082015160c087015160009261152f9263ffffffff160390611ce3565b90508063ffffffff168960c0015163ffffffff16146115585761c38996505050505050506115bb565b5050611588565b8360c0015163ffffffff168760c0015163ffffffff16146115885761c3909450505050506115bb565b826000015163ffffffff168760c0015163ffffffff16146115b15761c3909450505050506115bb565b505b600093505050505b9392505050565b6036546040805163a4cbce7b60e01b8152600481018790526001600160a01b038681166024830152858116604483015291516101009093049091169163a4cbce7b9160648082019260009290919082900301818387803b15801561162557600080fd5b505af1158015611639573d6000803e3d6000fd5b505060408051878152602081018590526001600160a01b0386168183015290517fffa243eaeafd66e0a938ee0d270bbefd594e08a551dc29a9a44e39c719cfc79f9350908190036060019150a1610dfd846119ec565b303b155b90565b60006115bb838360480161178f565b600061121960026116b7868686611d3e565b604051602001808281526020019150506040516020818303038152906040526040518082805190602001908083835b602083106117055780518252601f1990920191602091820191016116e6565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa158015611744573d6000803e3d6000fd5b5050506040513d602081101561175957600080fd5b5051611a31565b60006115bb838360440161178f565b602482820101516000906004830161178682611a31565b95945050505050565b6000816020840101516040518160031a60008201538160021a60018201538160011a60028201538160001a60038201535160e01c949350505050565b600060606117dc8484600401611d63565b90925090506117eb8483611deb565b60040194909350915050565b606060008060006118088787611e3e565b9650915084158061181857508185115b15611824575080611827565b50835b606081604051908082528060200260200182016040528015611853578160200160208202803883390190505b50905060005b8281101561189b5761187361186e8a8a6118e9565b611a31565b82828151811061187f57fe5b6020908102919091018101919091529790970196600101611859565b50979596505050505050565b6000805b600883048110156118e1578060080260020a85828601815181106118cb57fe5b016020015160f81c0291909101906001016118ab565b509392505050565b016020015190565b6000806000806000809050600063fabe6d6d60e01b905060006001600160e01b031990508751602089018181015b808210156119545784848351161415611949578561194257600482820384030196505b6001860195505b60018201915061191f565b50505060028310611976575060009550505060031901915061276090506119b3565b82600114156119a05761198988856118e9565b9650506003199092019350600192506119b3915050565b5060009550505060031901915061276a90505b9193909250565b60006115bb8383608001518460600151611ef0565b6000610bbb61186e83602001518461010001518560e00151611ef0565b600081815260336020526040812080546001600160a01b0319908116825560018201805490911690556002810182905560038101829055906107566004830182612407565b60405160009060ff8316815382601e1a600182015382601d1a600282015382601c1a600382015382601b1a600482015382601a1a60058201538260191a60068201538260181a60078201538260171a60088201538260161a60098201538260151a600a8201538260141a600b8201538260131a600c8201538260121a600d8201538260111a600e8201538260101a600f82015382600f1a601082015382600e1a601182015382600d1a601282015382600c1a601382015382600b1a601482015382600a1a60158201538260091a60168201538260081a60178201538260071a60188201538260061a60198201538260051a601a8201538260041a601b8201538260031a601c8201538260021a601d8201538260011a601e8201538260001a601f8201535192915050565b8151600090600019015b8015611c0857611b7361231e565b848281518110611b7f57fe5b60200260200101519050611b9161231e565b856001840381518110611ba057fe5b602002602001015190508551600c141580611bbe5750600186510383105b15611be157815163ffffffff868116911614611be15761c38a93505050506115bb565b8160200151816060015114611bfd5761c38c93505050506115bb565b505060001901611b65565b5082600081518110611c1657fe5b60200260200101516000015163ffffffff168263ffffffff1614611c3d575061c38a6115bb565b6004840154600211611c755782600081518110611c5657fe5b602002602001015160200151846003015414611c75575061c3936115bb565b5060009392505050565b6000611c89612428565b60005b600b811015611ccf57838160010181518110611ca457fe5b60200260200101516040015163ffffffff168282600b8110611cc257fe5b6020020152600101611c8c565b50611cd98161210a565b60a0015192915050565b600082614380811015611cf95750614380611d08565b616978811115611d0857506169785b6000611d1384610b7b565b6154609083020490506001600160ec1b03811115611d3557506001600160ec1b035b611786816121ac565b60006040516020818486602089010160025afa611d5a57600080fd5b51949350505050565b60006060600080611d748686611e3e565b9550915081611da457611d878686611e3e565b9550915081611d9557600080fd5b611d9f8686611e3e565b955091505b81600114611db157600080fd5b602485019450611dc18686611e3e565b955090506060611dd4878784810161223d565b9590910160040194859450925050505b9250929050565b6000806000611dfa8585611e3e565b94509150600a8210611e0b57600080fd5b60005b82811015611e3457600885019450611e268686611e3e565b810195509150600101611e0e565b5092949350505050565b6000806000848481518110611e4f57fe5b01602001516001949094019360f81c905060fd811015611e765760ff169150829050611de4565b8060ff1660fd1415611e9c57611e8e858560106118a7565b846002019250925050611de4565b8060ff1660fe1415611ec257611eb4858560206118a7565b846004019250925050611de4565b8060ff1660ff1415611ee857611eda858560406118a7565b846008019250925050611de4565b509250929050565b8051600090815b81811015611f3a57611f1b848281518110611f0e57fe5b6020026020010151611a31565b848281518110611f2757fe5b6020908102919091010152600101611ef7565b50600080611f4787611a31565b90505b828210156120f6576000858381518110611f6057fe5b6020026020010151905060008060028981611f7757fe5b0660011415611f8a575081905082611f90565b50829050815b600280838360405160200180838152602001828152602001925050506040516020818303038152906040526040518082805190602001908083835b60208310611fea5780518252601f199092019160209182019101611fcb565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa158015612029573d6000803e3d6000fd5b5050506040513d602081101561203e57600080fd5b50516040805160208181019390935281518082038401815290820191829052805190928291908401908083835b6020831061208a5780518252601f19909201916020918201910161206b565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa1580156120c9573d6000803e3d6000fd5b5050506040513d60208110156120de57600080fd5b50519350600289049850600185019450505050611f4a565b6120ff81611a31565b979650505050505050565b60005b600b8110156121a857600181015b600b81101561219f578281600b811061213057fe5b60200201518383600b811061214157fe5b602002015111156121975760008383600b811061215a57fe5b602002015190508382600b811061216d57fe5b60200201518484600b811061217e57fe5b6020020152808483600b811061219057fe5b6020020152505b60010161211b565b5060010161210d565b5050565b6000806121c56121bb8461228f565b60070160036122b7565b90506000600382116121ed576121e68462ffffff16836003036008026122cd565b9050612205565b6121fd84600384036008026122b7565b62ffffff1690505b6280000081161561222a576122218163ffffffff1660086122b7565b90506001820191505b6122358260186122cd565b179392505050565b6060600083830390506060816040519080825280601f01601f191660200182016040528015612273576020820181803883390190505b5090508160208201838760208a010160045afa61178657600080fd5b6000815b80156122b1576122a48160016122b7565b9050600182019150612293565b50919050565b60008160020a83816122c557fe5b049392505050565b60020a0290565b6040805161012081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e081018290529061010082015290565b60408051608081018252600080825260208201819052918101829052606081019190915290565b60405180610160016040528060008152602001600081526020016000815260200160608152602001600081526020016000815260200160008152602001606081526020016000815260200160008152602001600081525090565b81548183558181111561075657600083815260209020610756918101908301612447565b6040518060a0016040528060006001600160a01b0316815260200160006001600160a01b031681526020016000815260200160008019168152602001606081525090565b50805460008255906000526020600020908101906124259190612447565b50565b604051806101600160405280600b906020820280388339509192915050565b61169391905b80821115612461576000815560010161244d565b509056fe436f6e747261637420696e7374616e63652068617320616c7265616479206265656e20696e697469616c697a6564a265627a7a72315820a8e8b2d804696ad723930e9fcae3ed2b1026cbed146420d68a90369600c24af064736f6c634300050d0032";

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
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Uint256>() {}, new TypeReference<Address>() {}));
    ;

    public static final Event NEWBATTLE_EVENT = new Event("NewBattle", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Address>() {}, new TypeReference<Address>() {}));
    ;

    public static final Event RESPONDBLOCKHEADERS_EVENT = new Event("RespondBlockHeaders", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Uint256>() {}, new TypeReference<Address>() {}));
    ;

    public static final Event SUBMITTERCONVICTED_EVENT = new Event("SubmitterConvicted", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Uint256>() {}, new TypeReference<Address>() {}));
    ;

    protected static final HashMap<String, String> _addresses;

    static {
        _addresses = new HashMap<String, String>();
        _addresses.put("1", "0xC6867FF82Ec7C83Fc7b9158376a415dE86C7fde7");
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
            typedResponse.err = (Uint256) eventValues.getNonIndexedValues().get(1);
            typedResponse.challenger = (Address) eventValues.getNonIndexedValues().get(2);
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
                typedResponse.err = (Uint256) eventValues.getNonIndexedValues().get(1);
                typedResponse.challenger = (Address) eventValues.getNonIndexedValues().get(2);
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
            typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(1);
            typedResponse.challenger = (Address) eventValues.getNonIndexedValues().get(2);
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
                typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(1);
                typedResponse.challenger = (Address) eventValues.getNonIndexedValues().get(2);
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
            typedResponse.merkleHashCount = (Uint256) eventValues.getNonIndexedValues().get(1);
            typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(2);
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
                typedResponse.merkleHashCount = (Uint256) eventValues.getNonIndexedValues().get(1);
                typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(2);
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
            typedResponse.err = (Uint256) eventValues.getNonIndexedValues().get(1);
            typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(2);
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
                typedResponse.err = (Uint256) eventValues.getNonIndexedValues().get(1);
                typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(2);
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

    public RemoteFunctionCall<TransactionReceipt> respondBlockHeaders(Bytes32 superblockHash, DynamicBytes blockHeaders, Uint256 numHeaders) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_RESPONDBLOCKHEADERS, 
                Arrays.<Type>asList(superblockHash, blockHeaders, numHeaders), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> timeout(Bytes32 superblockHash) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_TIMEOUT, 
                Arrays.<Type>asList(superblockHash), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<Bool> getSubmitterHitTimeout(Bytes32 superblockHash) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETSUBMITTERHITTIMEOUT, 
                Arrays.<Type>asList(superblockHash), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Uint256> getNumMerkleHashesBySession(Bytes32 superblockHash) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETNUMMERKLEHASHESBYSESSION, 
                Arrays.<Type>asList(superblockHash), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Bool> sessionExists(Bytes32 superblockHash) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_SESSIONEXISTS, 
                Arrays.<Type>asList(superblockHash), 
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

        public Uint256 err;

        public Address challenger;
    }

    public static class NewBattleEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Address submitter;

        public Address challenger;
    }

    public static class RespondBlockHeadersEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Uint256 merkleHashCount;

        public Address submitter;
    }

    public static class SubmitterConvictedEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Uint256 err;

        public Address submitter;
    }
}
