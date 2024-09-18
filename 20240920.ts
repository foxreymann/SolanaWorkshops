import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Metaplex } from "@metaplex-foundation/js";
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";

const connection = pg.connection;
const signer = pg.wallet.keypair;

let airdrop = async () => {
  try {
    const initialBalance = await connection.getBalance(signer.publicKey);

    const signature = await connection.requestAirdrop(
      signer.publicKey,
      2 * web3.LAMPORTS_PER_SOL
    );

    const lastestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...lastestBlockhash,
    });

    const finalBalance = await connection.getBalance(signer.publicKey);
    console.log("airdrop");
    console.log(
      `Balans przed ${initialBalance / web3.LAMPORTS_PER_SOL}, balans po ${
        finalBalance / web3.LAMPORTS_PER_SOL
      }`
    );
  } catch (err) {
    console.log(err);
  }
};

let token = async () => {
  try {
    const mint = await createMint(
      connection,
      signer,
      signer.publicKey,
      signer.publicKey,
      9
    );

    console.log(`Token minted: ${mint.toBase58()}`);

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      signer,
      mint,
      signer.publicKey
    );

    console.log(`Signer's Token account: ${tokenAccount.address.toBase58()}`);

    const mintAmount = 123;
    await mintTo(
      connection,
      signer,
      mint,
      tokenAccount.address,
      signer,
      mintAmount * web3.LAMPORTS_PER_SOL
    );

    console.log(`Minted ${mintAmount} tokens`);
  
    return mint.toBase58()
  } catch (err) {
    console.log(err);
  }
};

let metadata = async ({ name, symbol, uri, mintAddress }) => {
  try {
    const mint = new web3.PublicKey(mintAddress);
    const metaplex = Metaplex.make(connection);

    const metadataPDA = metaplex.nfts().pdas().metadata({ mint });

    const tokenMetadata = {
      name,
      symbol,
      uri,
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    };

    const instruction = createCreateMetadataAccountV3Instruction({
      metadata: metadataPDA,
      mint,
      mintAuthority: signer.publicKey,
      payer: signer.publicKey,
      updateAuthority: signer.publicKey
    }, {
      createMetadataAccountArgsV3: {
        data: tokenMetadata,
        isMutable: true,
        collectionDetails: null
      }
    });

    const tx = new web3.Transaction().add(instruction)

    const signature = await web3.sendAndConfirmTransaction(
      connection,
      tx,
      [signer]
    )

    console.log(metadataPDA.toBase58());    
  } catch (err) {
    console.log(err);
  }
};

(async () => {
  try {
    await airdrop()
    const mintAddress = await token();

    await metadata({
      name: "Ewa Reymann",
      symbol: "EWA",
      uri: "https://jade-advisory-tarantula-129.mypinata.cloud/ipfs/QmdxkUirQW8Q8nLhirEp8Rehq9T7gZJHykkea8QJoRLMhe",
      mintAddress //: "3ueeAaNEu5bCd2c5MoPYEK8pcDbtw7GF7tvFkdb9ti2E",
    });
    
  } catch (err) {
    console.log(err);
  }
})();
