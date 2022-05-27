import deployContractByAccount1 from "./deploy-func";

async function main() {
  deployContractByAccount1("MAMarketplace");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
