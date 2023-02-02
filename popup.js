var enabled = true;
document.getElementById("enable").addEventListener("click", 
    () => {
        if (enabled) {
            document.getElementById("enable").style.filter = "grayscale(100%)";
            document.getElementById("disabled-text").style.display = "block";
            document.getElementById("enabled-text").style.display = "none";
        } else {
            document.getElementById("enable").style.filter = "grayscale(0%)";
            document.getElementById("enabled-text").style.display = "block";
            document.getElementById("disabled-text").style.display = "none";
        }
        enabled = !enabled;
    })
