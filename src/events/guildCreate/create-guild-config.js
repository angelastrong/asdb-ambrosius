module.exports = async (argument, client, handler) => {
    const configCreated = await createConfig(argument.id)
    if (configCreated) {
        console.log(`Server config created for ${argument.name}.`);
    } else {
        console.log(`Failed to create server config for ${argument.name}.`);
    }
  };