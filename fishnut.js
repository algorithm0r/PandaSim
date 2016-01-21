function Population(params) {
    this.params = params;

    this.agents = [];
    this.days = 0;
    this.births = 0;
    this.sexbirths = 0;
    this.dayasex = 0;
    this.daysex = 0;
    this.slept = 0;
    this.deaths = 0;
    this.deathage = 0;
    this.elapsed = this.params.maxenergy+1;
    this.newday = true;
    this.harvest = 0;
    this.overharvest = 0;
    this.initBred = 0;
    this.initBarren = 0;

    this.energys = [];
    this.ages = [];
    this.gens = [];
    this.memeGens = [];
    this.lengths = [];

    this.parents = [];
    this.initParents = [];
    this.childParents = [];
    this.parentsPhen = [];
    this.initParentsPhen = [];
    this.childParentsPhen = [];
    this.lengths = [];
    this.ratio = [];
    this.dayratio = [];
    this.related = [];
    this.geneStats = { breed: [], learn: [], social: [], optimized: [] };
    this.memeStats = { breed: [], learn: [], social: [], optimized: [] };
    this.philopatry = [[0, 0, 0, 0]];
    this.partners = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.children = [];
    this.genomeLog = [];
    this.phenoLog = [];
    this.partnersLog = [];
    this.sitesLog = [];
    this.parentsGenLog = [];
    this.parentsPhenLog = [];

    for (var i = 0; i < 100; i++) {
        this.parents.push(0);
        this.parentsPhen.push(0);
        this.initParents.push(0);
        this.initParentsPhen.push(0);
        this.childParents.push(0);
        this.childParentsPhen.push(0);
        this.children.push(0);
    }

    for (var i = 0; i < this.params.numagent; i++) {
        var a;
        if (this.params.genome.path) a = new Agent(this.params, this.births++);
        if (this.params.genome.stochastic) a = new StochasticAgent(this.params, this.births++);
        this.agents.push(a);
    }
}

Population.prototype.day = function () {
    //console.log("Day Start " + Math.floor(Date.now() % 100000) / 1000);
    this.days++;
    if (this.days > this.params.runlength || this.agents.length === 0) {
        this.newPop = new Population(this.params);
        //        this = new Population(this.params);
        if (this.days > this.params.runlength) {
        }
    }
    this.elapsed = this.params.maxenergy;
    this.dayasex = 0;
    this.daysex = 0;
    this.slept = 0;
    this.deaths = 0;
    this.harvest = 0;
    this.overharvest = 0;

    var livingAgents = 0;
    // for rendering
    var sites = [];
    var sexIntervals = new IntervalList();
    var socialIntervals = new IntervalList();
    var sampleLength = this.params.runlength / 100;
    var epochLength = this.params.runlength;

    var genomeLog = [];
    var phenoLog = [];
    var pop = [];
    var geneStats = { breed: 0, learn: 0, social: 0, optimized: 0 };
    var memeStats = { breed: 0, learn: 0, social: 0, optimized: 0 };

    var that = this;
    function logDay() { return (that.days - 1) % sampleLength === 0; }
    function endDay() { return (that.days - 1) % epochLength === 0 && that.days > 1; }

    for (var i = 0; i < this.params.map.sitelist.length; i++) {
        var site = this.params.map.sitelist[i];
        if (site.feedcount > 0) this.harvest++;
        if (site.feedcount > site.yield * site.reward) this.overharvest++;
        sites.push([]);
    }
    this.params.map.day();

    this.ages = [];
    this.gens = [];
    this.memeGens = [];
    this.energys = [];
    this.lengths = [];

    this.ratio = { max: 0, min: 2000000, average: 0 };
    this.dayratio = { max: 0, min: 2000000, average: 0, count: 0 };
    this.resources = { max: 0, min: 4 * this.params.maxenergy, average: 0 };
    for (var i = this.agents.length - 1; i >= 0; i--) {
        var agent = this.agents[i];
        //if (!agent) console.log(agent);
        if (agent.energy < 0 || agent.bestday && agent.bestday.index === -1) {
            //if (agent.bestday.index === -1) console.log("Agent " + i + "/" + this.agents.length + " is dead at age " + agent.age + ".");
            this.deaths++;
            agent.dead = true;
            // agent dead

            this.children[agent.children.length]++;

            if (agent.id < this.params.numagent) { // initial agent(s)
                if (agent.children.length > 0) this.initBred++;
                else this.initBarren++;

                var mate = 0;
                for (var j = 0; j < agent.children.length; j++) {
                    var child = agent.children[j];
                    if (child.gen > 0) {
                        if (agent.mates[mate] < this.params.numagent) {
                            this.initParents[Math.min(99, child.gen)]++;
                            this.initParentsPhen[Math.min(99, child.phe)]++;
                        }
                        else {
                            this.childParents[Math.min(99, child.gen)]++;
                            this.childParentsPhen[Math.min(99, child.phe)]++;
                        }
                    }
                    else mate--;

                    mate++;
                }

                if (this.initBarren + this.initBred === this.params.numagent) console.log(this.initBred + "/" + this.params.numagent + " of Initial Population Bred");
            }

            if (agent.sitesbred.length === 0) this.philopatry[0][0]++;
            else {
                while (this.philopatry.length < agent.sitesbred.length + 1) this.philopatry.push([0, 0, 0, 0]);
            }
            var philopatry = false;
            var wander = false;

            for (var j = 0; j < agent.sitesbred.length; j++) {
                if (agent.sitesbred[j] === agent.siteborn) {
                    philopatry = true;
                } else {
                    wander = true;
                }
            }
            if (philopatry && wander) this.philopatry[agent.sitesbred.length][2]++;
            else if (philopatry) this.philopatry[agent.sitesbred.length][3]++;
            else if (wander) this.philopatry[agent.sitesbred.length][1]++;

            //console.log("DEATH\tage: " + agent.age + "\tbirths: " + agent.births + "\tgen: " + agent.gen + "\tlength: "
            //+ agent.genome.geneplex.genes.length);
            this.agents.splice(i, 1);
            //this.related.splice(i, 1);
            //for (var j = 0; j < this.related.length; j++) this.related[j].splice(i, 1);
        }
        else {
            //if (agent.bestday && agent.bestday.index === -1) console.log("Why am I not dead?");

            if (agent.bestday) agent.update();

            // data gathering
            this.params.map.sitelist[agent.site].slept++;

            this.gens.push(agent.gen);

            if (agent.bestday) {
                this.memeGens.push(agent.bestday.gen);
            }
            this.ages.push(agent.age);
            this.energys.push(agent.energy);

            this.resources.max = Math.max(this.resources.max, agent.resources);
            this.resources.min = Math.min(this.resources.min, agent.resources);
            this.resources.average += agent.resources / this.agents.length;
            var gp = agent.genome.geneplex;
            if (gp) {
                this.lengths.push(agent.genome.geneplex.length);
           
                this.ratio.max = Math.max(this.ratio.max, agent.genome.geneplex.resourcesRatio);
                this.ratio.min = Math.min(this.ratio.min, agent.genome.geneplex.resourcesRatio);
                this.ratio.average += agent.genome.geneplex.resourcesRatio / this.agents.length;
            }
            if (agent.bestday && agent.energy > this.params.maxenergy) {
                var ratio = agent.resources / agent.bestday.energy;
                //if (ratio > 1) {
                //    console.log("Agent Energy " + agent.energy);
                //    console.log(agent.resources + "/" + agent.bestday.energy);
                //    var str = "";
                //    for (var j = 0; j < agent.bestday.indexlist.length - 1; j++) {
                //        str += "" + this.params.map.sitelist[agent.bestday.indexlist[j].index].reward +  " + ";
                //    }
                //    console.log(str);
                //}

                if (ratio < 1 && ratio > 0) {
                    this.dayratio.max = Math.max(this.dayratio.max, ratio);
                    this.dayratio.min = Math.min(this.dayratio.min, ratio);
                    this.dayratio.average += ratio;
                    this.dayratio.count++;
                }
            }
  
            // breding intervals
            if (agent.breeding) {
                var ints = agent.bestday.breedIntervals;
                sites[agent.site].push(agent);
                if (ints === undefined) console.log(agent.bestday + " " + agent.energy);
                for (var j = 0; j < ints.length; j++) {
                    var interval = ints[j];
                    interval.agent = agent;
                    if(sexIntervals.insert(interval)) break;
                }
            }

            // social learning intervals
            agent.social = true; // hack... move to params
            if (agent.social && agent.bestday) {
                var ints = agent.bestday.socialIntervals;
                if (ints === undefined) console.log(agent.bestday + " " + agent.energy);
                for (var j = 0; j < ints.length; j++) {
                    //              if (Math.random() < this.params.mutationrate) {
                    var interval = ints[j];
                    interval.agent = agent;
                    if (socialIntervals.insert(interval)) break;
                    //              }
                }
            }
   
            agent.elapsed = this.elapsed;

            if (logDay()) {
                livingAgents++;
                var gp = agent.genome.geneplex;
                if (gp) {
                    var sl = gp.siteList;
                    sl = [gp.genes.length].concat(sl);
                    //console.log(sl);

                    genomeLog.push(agent.id + " " + gp.genes.length + " " + gp.siteList.join(" "));
                }
                var psl = [];
                if (agent.bestday && agent.bestday.indexlist) {
                    var index = agent.bestday.indexlist.length - 1;
                    psl = [index];
                    var str = agent.id + " " + index + " ";
                    for (var j = 0; j < agent.bestday.indexlist.length - 1; j++) {
                        psl.push(agent.bestday.indexlist[j].index);
                    }
                    str += psl.join(" ");
                    phenoLog.push(str);
                }
                pop.push({ id: agent.id, genome: sl, phenome: psl });

                // calculate gene/meme stats
                if (gp) {
                    geneStats.breed += gp.breedlength / gp.length;
                    geneStats.learn += gp.learnlength / gp.length;
                    geneStats.social += gp.sociallength / gp.length;
                    geneStats.optimized += gp.optimized / gp.genes.length;
                }

                if (agent.bestday && agent.bestday.index === -1) console.log("Why am I not dead? Take 2.");

                var mp = agent.bestday;
                if (mp) {
                    if (mp.index === -1) {
                        console.log("Age: " + agent.age + " GP: " + gp.length + " Site: " + agent.site);
                        console.log(agent.memome.memeplexes[agent.site]);
                    }
                    memeStats.breed += mp.breedlength / mp.length;
                    memeStats.learn += mp.learnlength / mp.length;
                    memeStats.social += mp.sociallength / mp.length;
                    if (mp.genes) memeStats.optimized += mp.optimized / mp.genes.length;
                }
            }

            agent.day();
        }
    }
    this.dayratio.count > 0 ? this.dayratio.average /= this.dayratio.count : this.dayratio.average = 0;

    this.elapsed = 0;

    // social learning
    //console.log("Start Social " + Date.now());
    console.log("Sex: " + sexIntervals.partners.length + " Social: " + socialIntervals.partners.length);
    //console.log("Social Start " + Math.floor(Date.now() % 100000) / 1000);
    for (var i = 0; i < socialIntervals.partners.length; i++) {
        var partner = socialIntervals.partners[i];
        var agent = partner.mother;
        var other = partner.father;
        //if (!agent) {
        //    console.log(partner.agent);
        //    console.log(this.agents);
        //}

        if (other.bestday.index !== -1) {
            var mp = other.bestday.clone();
            mp.mutate();
            var site = mp.genes[0].site.index;
            if (!agent.memome.memeplexes[site]) agent.memome.memeplexes[site] = [];
            agent.memome.memeplexes[site].push(mp);
        }

        //console.log(agent.bestday);
        if (agent.bestday.index !== -1) {
            var mp = agent.bestday.clone();
            mp.mutate();
            var site = mp.genes[0].site.index;
            if (!other.memome.memeplexes[site]) other.memome.memeplexes[site] = [];
            other.memome.memeplexes[site].push(mp);
        }
        this.params.map.sitelist[partner.site].social++;
    }
    //console.log("Start Sex " + Date.now());

    // sexual interval breeding
    //console.log("Sex Start " + Math.floor(Date.now() % 100000) / 1000);
    for (var i = 0; i < sexIntervals.partners.length; i++) {
        var partner = sexIntervals.partners[i];
        var agent = partner.mother;
        var other = partner.father;
        //if (!agent) {
        //    console.log(parnter.agent);
        //    console.log(this.agents);
        //}

        if (agent.breeding && agent.energy > agent.genome.sexual + this.params.maxenergy
            && other.breeding && other.energy > other.genome.sexual + this.params.maxenergy) {

            agent.sitesbred.push(partner.site);

            var newagent = agent.sex(other, this.births + this.sexbirths);

            if (newagent === null) continue;

            newagent.siteborn = partner.site;
            newagent.site = partner.site;

            this.sexbirths++;
            this.params.map.sitelist[partner.site].sex++;

            this.parents[Math.min(99, newagent.parentrelated)]++;

            this.parentsPhen[Math.min(99, newagent.parentPhenRelated)]++;

            this.agents.push(newagent);
            break;
        }
    }
    //console.log("End Sex " + Date.now());
    //console.log("Asex Start " + Math.floor(Date.now() % 100000)/ 1000);

    // asexual night breeding
    for (var i = 0; i < this.agents.length; i++) {
        var agent = this.agents[i];
        if (agent.breeding && this.params.asexualon && agent.energy > agent.genome.asexual + this.params.maxenergy) {
            // agent asexually breeds
            //console.log("ASEX\tsite: " + agent.site + "\tenergy: " + Math.floor(agent.energy) +
            //"\tasexual: " + agent.genome.asexual + "\tsexual: " + agent.genome.sexual);
            var newagent = agent.asex(this.births + this.sexbirths);

            if (newagent === null) continue;
            this.births++;

            newagent.siteborn = agent.site;
            newagent.site = agent.site;
            this.agents.push(newagent);
        }
    }

    for (var i = 0; i < this.params.map.sitelist.length; i++) {
        var site = this.params.map.sitelist[i];
        if (site.slept > 0) this.slept++;
        if (site.sex > 0) this.daysex++;
        if (site.asex > 0) this.dayasex++;
    }
    if (logDay()) {
        var sites = [];
        for (var i = 0; i < this.params.numsites; i++) {
            var site = this.params.map.sitelist[i];
            var s = { x: site.x, y: site.y, index: site.index, totalsex: site.totalsex, totalasex: site.totalasex, visits: site.totalvisits, social: site.social };
            sites.push(s);
        }
        //this.genomeLog.push(genomeLog.length + "\r\n" + genomeLog.join("\r\n") + "\r\n");
        //this.phenoLog.push(phenoLog.length + "\r\n" + phenoLog.join("\r\n") + "\r\n");
        //this.partnersLog.push(this.partners.join(" "));
        //this.sitesLog.push(this.params.map.totalsex.join(" "));
        //this.parentsGenLog.push(this.parents.join(" "));
        //this.parentsPhenLog.push(this.parentsPhen.join(" "));

        this.geneStats.breed.push(geneStats.breed / livingAgents);
        this.geneStats.learn.push(geneStats.learn / livingAgents);
        this.geneStats.social.push(geneStats.social / livingAgents);
        this.geneStats.optimized.push(geneStats.optimized / livingAgents);

        this.memeStats.breed.push(memeStats.breed / livingAgents);
        this.memeStats.learn.push(memeStats.learn / livingAgents);
        this.memeStats.social.push(memeStats.social / livingAgents);
        this.memeStats.optimized.push(memeStats.optimized / livingAgents);

        var log = {
            run: "2016",
            numagent: this.params.numagent,
            name: this.params.mapname,
            day: this.days,
            asexualon: this.params.asexualon,

            children: this.children,
            geneStats: this.geneStats,
            memeStats: this.memeStats,
            ages: this.ages,
            lengths: this.lengths,
            gens: this.gens,
            memeGens: this.memeGens,
            energys: this.energys,
            population: pop,
            sites: sites,
            parentsGen: this.parents,
            parentsPhe: this.parentsPhen,
            philopatry: this.philopatry,
            initGen: this.initParents,
            initBred: this.initBred,
            initBarren: this.initBarren,
            initPhe: this.initParentsPhen,
            offGen: this.childParents,
            offPhe: this.childParentsPhen
        };
        //console.log("Data logged day " + this.days);
        //console.log(socket);
        socket.emit("savepop", log);
   }
    if (endDay()) {
        if (this.params.download) {
            var filename = "Run" + this.params.mapname + "-R" + Math.floor(this.days / epochLength) + "-Gen.txt";
            download(filename, this.genomeLog.join(""));

            filename = "Run" + this.params.mapname + "-R" + Math.floor(this.days / epochLength) + "-Phe.txt";
            download(filename, this.phenoLog.join(""));

            filename = "Run" + this.params.mapname + "-R" + Math.floor(this.days / epochLength) + "-Part.txt";
            download(filename, this.partnersLog.join("\r\n"));

            filename = "Run" + this.params.mapname + "-R" + Math.floor(this.days / epochLength) + "-Site.txt";
            download(filename, this.sitesLog.join("\r\n"));

            filename = "Run" + this.params.mapname + "-R" + Math.floor(this.days / epochLength) + "-ParentsGen.txt";
            download(filename, this.parentsGenLog.join("\r\n"));

            filename = "Run" + this.params.mapname + "-R" + Math.floor(this.days / epochLength) + "-ParentsPhen.txt";
            download(filename, this.parentsPhenLog.join("\r\n"));
        }
        this.genomeLog = [];
        this.phenoLog = [];
        this.partnersLog = [];
        this.sitesLog = [];
        this.parentsGenLog = [];
        this.parentsPhenLog = [];
    }
    //console.log("Day End " + Math.floor(Date.now() % 100000) / 1000);

}

Population.prototype.update = function () {
    var speed = document.getElementById('speed').value;
    this.elapsed += this.params.engine.clockTick * speed;
    if (this.elapsed > this.params.maxenergy) this.newday = true;

    if (this.newday) {
        this.newday = false;
        this.day();
    }

    for (var i = 0; i < this.agents.length; i++) {
        var agent = this.agents[this.agents.length - 1 - i];
        agent.elapsed = this.elapsed;
        agent.update();
    }
}

var ASSET_MANAGER = new AssetManager();
var socket = null;
if (window.io !== undefined) {
    console.log("Database connected!");
    socket = io.connect('http://76.28.150.193:8888');
}
ASSET_MANAGER.queueDownload("./img/FishSite.png");
ASSET_MANAGER.queueDownload("./img/NutSite.png");
ASSET_MANAGER.queueDownload("./img/Hut.png");
ASSET_MANAGER.queueDownload("./img/FishNutter.png");

ASSET_MANAGER.downloadAll(function () {
    console.log("starting up da sheild");
    var canvas = document.getElementById('gameWorld');
    var play = document.getElementById('play');
    var restart = document.getElementById('restart');
    var savemap = document.getElementById('savemap');
    var loadmap = document.getElementById('loadmap');
    var newmap = document.getElementById('newmap');
    var simStart = false;

    var ctx = canvas.getContext('2d');
    var gameEngine = new GameEngine();

    var fnn = {};
    fnn.engine = gameEngine;

    var p;

    var randomName = function() {
        var lst = [];
        var chars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        for (var i = 0; i < 8; i++) {
            var index = Math.floor(Math.random()*chars.length);
            lst.push(chars[index]);
        }
        return lst.join("");
    }

    var saveMap = function () {
        console.log("save clicked");
        var map = { name: fnn.mapname, reach: fnn.reach };
        var sitelist = [];
        var site = {};
        for (var i = 0; i < fnn.numsites; i++) {
            var s = fnn.map.sitelist[i];
            site = { x: s.x, y: s.y, reward: s.reward, perm: s.perm.perm };
            sitelist.push(site);
        }
        map.sitelist = sitelist;
        if(socket) socket.emit("savemap", map);
    }

    var newMap = function () {
        fnn.permsize = document.getElementById('permsize') ? parseInt(document.getElementById('permsize').value) : 5;
        fnn.rewardmin = document.getElementById('rewardmin') ? parseInt(document.getElementById('rewardmin').value) : 1;
        fnn.rewardmax = document.getElementById('rewardmax') ? parseInt(document.getElementById('rewardmax').value) : 3;
        fnn.numsites = document.getElementById('numsites') ? parseInt(document.getElementById('numsites').value) : 100;
        fnn.reach = document.getElementById('reach') ? parseFloat(document.getElementById('reach').value) : 0.2;
        fnn.yield = document.getElementById('yield') ? parseInt(document.getElementById('yield').value) : 25;
        fnn.mapname = document.getElementById('mapname') ? document.getElementById("mapname").value : "";
        if (fnn.mapname === "") {
            document.getElementById("mapname").value = randomName();
            fnn.mapname = document.getElementById("mapname").value;
        }
        fnn.map = new SiteMap(fnn);
        saveMap();
        newPop();
    }

    var newPop = function () {
        fnn.numagent = document.getElementById('numagent') ? parseInt(document.getElementById('numagent').value) : 1;
        fnn.maxenergy = document.getElementById('maxenergy') ? parseInt(document.getElementById('maxenergy').value) : 50;
        fnn.asexual = document.getElementById('asexual') ? parseInt(document.getElementById('asexual').value) : 50;
        fnn.sexual = document.getElementById('sexual') ? parseInt(document.getElementById('sexual').value) : 25;
        fnn.asexualon = document.getElementById('asexualon') ? document.getElementById('asexualon').checked : true;
        fnn.sexualon = document.getElementById('sexualon') ? document.getElementById('sexualon').checked : true;
        fnn.genome = {};
        fnn.genome.path = document.getElementById('genome_path') ? document.getElementById('genome_path').checked : true;
        fnn.genome.stochastic = document.getElementById('genome_stochastic') ? document.getElementById('genome_stochastic').checked : false;
        fnn.genome.noise = document.getElementById('noise') ? parseInt(document.getElementById('noise').value) : 1;
        //fnn.maximize = document.getElementById('maximize').checked;
        //fnn.continue = document.getElementById('continue').checked;
        fnn.resourcefactor = document.getElementById('resourcefactor') ? parseFloat(document.getElementById('resourcefactor').value) : 2.5;
        fnn.restcost = document.getElementById('restcost') ? parseFloat(document.getElementById('restcost').value) : 0.01;
        fnn.agecost = document.getElementById('agecost') ? parseFloat(document.getElementById('agecost').value) : 0.00025;
        //fnn.clusters = document.getElementById('clusters').checked;
        fnn.mutationlength = document.getElementById('mutationlength') ? parseInt(document.getElementById('mutationlength').value) : 20;
        fnn.mutationrate = document.getElementById('mutationrate') ? parseFloat(document.getElementById('mutationrate').value) : 0.05;
        //fnn.clusterthreshold = parseFloat(document.getElementById('clusterthreshold').value);
        fnn.runlength = document.getElementById('runlength') ? parseInt(document.getElementById('runlength').value) : 5000;
        fnn.download = document.getElementById('download') ? document.getElementById('download').checked : false;

        p = new Population(fnn);

        var renderer = new Renderer(p, fnn.map);
        if (gameEngine.entities.length === 1) gameEngine.entities.splice(0, 1);
        gameEngine.addEntity(renderer);
    }

    newMap();
    fnn.pause = true;
    play.onclick = function () {
            fnn.pause = !fnn.pause;
    };

    restart.onclick = function () {
        fnn.map.reset();
        newPop();
    };

    newmap.onclick = function () {
        newMap();
    }


    savemap.onclick = function () {
        fnn.mapname = document.getElementById("mapname").value;
        saveMap();
    };

    loadmap.onclick = function () {
        fnn.mapname = document.getElementById("mapname").value;
        if(socket) socket.emit("loadmap", { name: fnn.mapname });
    };

    if(socket) socket.on("loadmap", function (map) {
        console.log(map.name + " loaded from db");
        fnn.reach = map.reach;
        fnn.numsites = map.sitelist.length;
        fnn.map = new SiteMap(fnn, map.sitelist);

        p = new Population(fnn);
        var renderer = new Renderer(p, fnn.map);
        if (gameEngine.entities.length === 1) gameEngine.entities.splice(0, 1);
        gameEngine.addEntity(renderer);
    });

    gameEngine.init(ctx);
    gameEngine.start();

});
