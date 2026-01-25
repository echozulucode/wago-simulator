# Original Goal Notes

- I want to simulate the wago modbus/tcp and modbus/udp fieldbus coupler 750-362 and associated cards
- pay particular attention to how the modules are discovered over modbus
- the simulator should be written in rust + tauri
- I want to be able to simulate multiple racks based on a yaml based configuration file and each running their communication server separately. The user should be able to set the port to listen on.
- I want the configuration file to contain default values and optionally logic for each of the I/O elements. For instance, an output may be hooked to a contactor coil and the status is conveyed in an input on another card after a time delay.
- I want a visual representation of the rack to be sortof like the Wago I/O check tool in the attached PDF
- the user should be able to force / override the i/o values returned to the client. this is mainly for debugging the software developed that will control and interface to it.
- if the user puts scale information for analogs, they should be able to see the raw register values and engineering units based on the scale.
- I'm thinking that I would want to have a selector on the left for which I/O module is in the main view, but the list should also convey some information like communication status, unique id, comm settings maybe..
