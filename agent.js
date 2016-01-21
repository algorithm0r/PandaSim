var Genome = function (params) {
    this.params = params;
    this.geneplex = new Geneplex(this.params);

    this.asexual = this.params.asexual;
    this.sexual = this.params.sexual;
}

Genome.prototype.mutate = function () {
    if (Math.random() < this.params.mutationrate) {
        Math.random() > 0.5 ? this.asexual++ : this.asexual--;
        this.asexual = this.asexual < this.params.maxenergy ? this.params.maxenergy : this.asexual;
        if (this.asexual === undefined) console.log(this.asexual);
    }
    if (Math.random() < this.params.mutationrate) {
        Math.random() > 0.5 ? this.sexual++ : this.sexual--;
        this.sexual = this.sexual < this.params.maxenergy / 2 ? this.params.maxenergy / 2 : this.sexual;
        if (this.sexual === undefined) console.log(this.sexual);
    }
    return this.geneplex.mutate();
}

Genome.prototype.crossover = function (genome) {
    //if (Math.random > 0.5) this.geneplex.reverse();
    //if (Math.random() < 0.5) {
    //    this.geneplex = genome.geneplex.clone();
    //}
    //this.geneplex.crossover(genome.geneplex);
    if (Math.random() < 0.5) this.asexual = genome.asexual;
    if (Math.random() < 0.5) this.sexual = genome.sexual;
    var related = this.geneplex.crossover(genome.geneplex);
    this.mutate();
    return related;
}

Genome.prototype.clone = function () {
    var g = new Genome(this.params);

    g.geneplex = this.geneplex.clone();
    g.asexual = this.asexual;
    g.sexual = this.sexual;

    return g;
}

function Agent(params, id) {
    this.params = params;
    this.energy = this.params.maxenergy;
    this.genome = new Genome(this.params);
    this.memome = this.genome.geneplex.createMemome();
    this.site = this.genome.geneplex.genes[0].site.index;
    this.gene = 0;
    this.bestday = null;
    this.newday = true;
    this.elapsed = 0;
    this.resources = 0;
    this.lastindex = 0;
    this.age = 0;
    this.births = 0;
    this.sexbirths = 0;
    this.gen = 0;
    this.lovechild = false;
    this.mutated = false;
    this.breeding = false;
    this.socialized = 0;
    this.parentrelated = -1;

    //console.log(id);
    this.id = id;
    this.mates = [];
    this.sitesbred = [];
    this.children = [];

    this.bestday = null;
}

Agent.prototype.day = function () {
    this.age++;

    if (this.bestday && this.bestday.index !== -1) {
        //if (this.resources === 0 && this.resources !== this.bestday.reward) {
        //    console.log(this.bestday.siteList);
        //    console.log(this.bestday.gen);
        //}
        if (this.bestday.learn > 0 && this.resources === this.bestday.reward) {
            //console.log("New Memeplex Created");
            var newMemeplex = this.bestday.clone();
            newMemeplex.mutate();
            newMemeplex.findBestDay(Math.min(this.energy, this.params.maxenergy));
            //console.log(this.bestday.siteList + " E:" + this.bestday.energy + " R:" + this.bestday.reward);
            //console.log(newMemeplex.siteList + " E:" + newMemeplex.energy + " R:" + newMemeplex.reward);
            var site = newMemeplex.genes[0].site.index;
            this.memome.memeplexes[site].push(newMemeplex);
        }

        var num = this.energy - this.bestday.energy + this.params.resourcefactor * this.resources - (this.params.maxenergy - this.bestday.energy) * this.params.restcost - this.age * this.age * this.params.agecost;
        this.energy = num;
    }

    if ((this.params.sexualon && this.energy > this.genome.sexual + this.params.maxenergy)
        || (this.params.asexualon && this.energy > this.genome.asexual + this.params.maxenergy))
        this.breeding = true;
    else this.breeding = false;
    
    if (this.memome !== null)
        this.bestday = this.memome.findBestDay(this.site, Math.min(this.energy, this.params.maxenergy));
    else this.bestday = null;
  //  console.log(this.bestday);
    this.resources = 0;
    this.lastindex = 0;
    this.socialized = 0;
}

Agent.prototype.update = function () {
    var i = 0;
    var delay = 0;
 //   var delay = (this.params.maxenergy - this.bestday.energy) / 2;

    if (this.bestday && this.bestday.genes && this.bestday.genes.length > 0) {
//        console.log(this.elapsed);
        while (i < this.bestday.genes.length && this.bestday.genes[i].start + delay < this.elapsed && this.bestday.genes[i].start + delay < this.energy) i++;
        i--;
        if (i > this.lastindex) {
            for (var j = this.lastindex; j < i; j++) {
                var index = this.bestday.genes[j].site.index;
                var lastindex = j === 0 ? index : this.bestday.genes[j - 1].site.index;
                this.params.map.visited[lastindex][index]++;
                this.params.map.visited[index][lastindex]++;
                var gene = this.bestday.genes[j];

                var reward = gene.site.gather(gene.perm).reward;

                // simple reinforcement learning
                if (gene.learn > 0 && reward !== gene.learnedReward) gene.learnedReward = reward;

                this.resources += reward;
                //console.log(this.lastindex + j + " resources " + this.resources);
            }
            this.lastindex = i;
            this.site = this.bestday.genes[i].site.index;
            this.gene = this.bestday.genes[i];
        }
    }
}

Agent.prototype.mutate = function () {
    this.mutated = this.genome.mutate();
}

Agent.prototype.crossover = function (agent) {
    this.parentrelated = this.genome.crossover(agent.genome);
    //console.log(this.parentrelated);
}

Agent.prototype.clone = function (id) {
    var a = new Agent(this.params, id);
    a.genome = this.genome.clone();
    a.site = this.site;
    a.gen = this.gen;
    return a;
}

Agent.prototype.asex = function (id) {
    this.births++;
    this.params.map.sitelist[this.site].asex++;
    var newagent = this.clone(id);

    newagent.mutate();
    if (newagent.genome.geneplex.genes.length < 12) return null;
    newagent.memome = newagent.genome.geneplex.createMemome();
    newagent.gen++;
    newagent.day();

    //console.log(this.genome.geneplex.siteList);
    //console.log(newagent.genome.geneplex.siteList);

    var genomeLengthPenalty = newagent.genome.geneplex.genes.length / 16;
    var cost = this.params.maxenergy + genomeLengthPenalty;

    this.energy -= cost;
    this.breeding = false;

    this.children.push({ gen: -1, phe: -1 });

    return newagent;
}

Agent.prototype.sex = function (father, id) {
    var mother = this;
    //console.log("sex");
    mother.sexbirths++;
    father.sexbirths++;

    var newagent = mother.clone(id);
    newagent.crossover(father);
    newagent.mutate();
    if (newagent.genome.geneplex.genes.length < 12) return null;
    newagent.gen = Math.max(mother.gen, father.gen) + 1;
    newagent.memome = newagent.genome.geneplex.createMemome();
    newagent.lovechild = true;
    //console.log("Mother: " + mother.genome.geneplex.siteList);
    //console.log("Father: " + father.genome.geneplex.siteList);
    //console.log("Offspring: " + newagent.genome.geneplex.siteList);
    newagent.bestday = { index: -1 };
    newagent.day();
    
    var fSeq = new SiteSequence(father.genome.geneplex.siteList);
    var mSeq = new SiteSequence(mother.genome.geneplex.siteList);

    newagent.parentrelated = fSeq.levenshtein(mSeq).levenshtein;
   
    fSeq = new SiteSequence(father.bestday.siteList);
    mSeq = new SiteSequence(mother.bestday.siteList);

    //console.log(fSeq.seq);
    //console.log(mSeq.seq);

    newagent.parentPhenRelated = fSeq.levenshtein(mSeq).levenshtein;

    var genomeLengthPenalty = newagent.genome.geneplex.genes.length / 16;
    var cost = (this.params.maxenergy + genomeLengthPenalty) / 2;

    mother.energy -= cost;
    father.energy -= cost;

    mother.mates.push(father.id);
    father.mates.push(mother.id);

    mother.children.push({ gen: newagent.parentrelated, phe: newagent.parentPhenRelated });
    father.children.push({ gen: newagent.parentrelated, phe: newagent.parentPhenRelated });

    mother.breeding = false;
    father.breeding = false;

    return newagent;
}
