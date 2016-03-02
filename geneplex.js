var Gene = function (site, perm, params) {
    this.type = "Gather";
    this.site = site;
    this.params = params;
    this.perm = perm;
    this.breed = (Math.random() < 0.5 && !this.params.asexualon) ? 0.1 * Math.floor(Math.random() * 5) : 0;
    //this.learn = Math.random() < 0.5 ? 0.1 * Math.floor(Math.random() * 5) : 0;
    //this.social = Math.random() < 0.5 ? 0.1 * Math.floor(Math.random() * 5) : 0;
    this.learn = 0;
    this.social = 0;
}

Gene.prototype.cost = function () {
    if (this.site != null) return this.site.cost(this.perm) + this.breed + this.learn + this.social;
    return 1;
}

Gene.prototype.reward = function () {
    if (!this.learnedReward) this.learnedReward = this.site.reward;
    return this.learnedReward;
}

Gene.prototype.mutate = function () {
    var that = this;
    function mutation() {
        return Math.random() < that.params.mutationrate;
    }

    if (mutation() && this.perm != null) this.perm.mutate();

    if (mutation()) if (Math.random() > 0.5) this.breed += 0.1;
    else this.breed -= 0.1;
    if (this.breed < 0) this.breed = 0;

    if (mutation()) if (Math.random() > 0.5) this.learn += 0.1;
    else this.learn -= 0.1;
    if (this.learn < 0) this.learn = 0;

    if (mutation()) if (Math.random() > 0.5) this.social += 0.1;
    else this.social -= 0.1;
    if (this.social < 0) this.social = 0;
}

    Gene.prototype.clone = function () {
        var g = new Gene(this.site, this.perm.clone(), this.params);
        g.breed = this.breed;
        g.learn = this.learn;
        g.social = this.social;
        return g;
    }

    var Geneplex = function (params) {
        this.params = params;
        this.genes = [];
        this.rewind = false;
        this.gene = -1;

        var length = 0;
        var gene = new Gene(this.params.map.sitelist[Math.floor(Math.random() * this.params.map.sitelist.length)], new Perm(this.params.permsize), this.params);
        length += gene.cost();
        this.genes.push(gene);

        while (length < params.maxenergy * 4) {
            var adj = [];
            for (var i = 0; i < params.map.sitelist.length; i++) {
                if (params.map.adjacencymatrix[gene.site.index][i] !== 0) adj.push(i);
            }
            var j = adj[Math.floor(Math.random() * adj.length)];
            length += (this.params.map.adjacencymatrix[gene.site.index][j]);
            gene = new Gene(this.params.map.sitelist[j], new Perm(this.params.permsize), this.params);
            length += gene.cost();
            this.genes.push(gene);
        }

        this.updateStats();
        //console.log(Math.floor(this.length*100)/100 + " " + this.resources + " " + Math.floor(this.resourcesRatio*100)/100);
    }

    Geneplex.prototype.mutate = function () {
        // mutate random genes in the list
        var that = this;

        function mutation() {
            return Math.random() < that.params.mutationrate;
        }

        for (var i = 0; i < this.genes.length; i++) {
            this.genes[i].mutate();
        }

        if (mutation()) {
            // grow
            // find a random cycle
            var sites = [];
            for (var i = 0; i < this.params.numsites; i++) {
                sites.push([]);
            }

            for (var i = 0; i < this.genes.length; i++) {
                sites[this.genes[i].site.index].push(i);
            }

            var cycles = [];
            var numCycles = 0;
            for (var i = 0; i < this.params.numsites; i++) {
                var len = sites[i].length;
                if (len > 1) {
                    cycles.push(i);
                    numCycles += len * (len - 1) / 2;
                }
            }

            var selection = Math.floor(Math.random() * numCycles);
            numCycles = 0;
            var start = -1;
            var end = -1;

            for (var i = 0; i < cycles.length; i++) {
                var lst = sites[cycles[i]];
                var len = lst.length;
                var last = numCycles;
                numCycles += len * (len - 1) / 2;
                if (numCycles > selection) {
                    var diff = selection - last;
                    start = 0;
                    end = 1;
                    while (diff-- > 0) {
                        end++;
                        if (end > lst.length - 1) {
                            start++;
                            end = start + 1;
                        }
                    }
                    start = lst[start];
                    end = lst[end];
                    //             console.log(start + " " + end + " " + (end - start));
                    break;
                }
            }

            var cycle = Math.random() > 0.5 || start === -1 ? false : true;
            var deleted = Math.random() > 0.5 ? true : false;
            //       console.log("mutating cycle " + cycle + " deleted " + deleted);

            if (deleted) {
                if (cycle) {
                    //          console.log("deleted cycle " + (end - start) + " at " + start);
                    this.genes.splice(start, end - start);
                }
                else {
                    //            console.log("shrunk");
                    var rand = Math.floor(Math.random() * Math.min(this.params.mutationlength, this.genes.length)) + 1;

                    Math.random > 0.5 ? this.genes.splice(this.genes.length - rand) : this.genes.splice(0, rand);
                }
            }
            else {
                if (cycle) {
                    // add it somewhere else
                    var tempLst = [];
                    for (var i = start; i < end; i++) {
                        var gene = this.genes[i].clone();
                        if (mutation()) { gene.mutate(); }
                        tempLst.push(gene);
                    }
                    // console.log("added cycle " + (end - start + 1));
                    var indexes = sites[this.genes[start].site.index];
                    var insertAt = Math.floor(Math.random() * indexes.length);
                    //       console.log("added " + (end - start) + " at " + indexes[insertAt]);
                    //        console.log(this.genes[indexes[insertAt]].site.index + " " + tempLst[0].site.index);

                    for (var i = 0; i < tempLst.length; i++) {
                        var index = indexes[insertAt] + i;
                        this.genes.splice(index, 0, tempLst[i]);
                    }
                    //var j = end;
                    //while (start <= j) {
                    //    this.genes.splice(indexes[insertAt], 0, this.genes[j].clone());
                    //    if (indexes[insertAt] > start) j--;
                    //    else start++;
                    //}
                }
                else {
                    //      console.log("grew");
                    var front = Math.random() > 0.5 ? true : false;
                    var gene = front ? this.genes[0] : this.genes[this.genes.length - 1];
                    var rand = Math.floor(Math.random() * this.params.mutationlength) + 1;
                    //console.log("rand " + rand);
                    for (var k = 0; k < rand; k++) {
                        var adj = [];
                        for (var i = 0; i < this.params.map.sitelist.length; i++) {
                            if(!gene) console.log(this.genes);
                            if (this.params.map.adjacencymatrix[gene.site.index][i] > 0) adj.push(i);
                        }
                        var j = adj[Math.floor(Math.random() * adj.length)];
                        //console.log(adj);
                        gene = new Gene(this.params.map.sitelist[j], new Perm(this.params.permsize), this.params);
                        front ? this.genes.splice(0, 0, gene) : this.genes.push(gene);
                    }
                }
            }


            this.updateStats();

            return true;
        }
        this.updateStats();

        return false;
    }

    Geneplex.prototype.lcs = function (geneplex) {
        var s = [];
        var n = this.genes.length;
        var m = geneplex.genes.length;
        for (var i = 0; i < n + 1; i++) {
            s.push([]);
            for (var j = 0; j < m + 1; j++) {
                s[i].push(0);
            }
        }

        for (var i = 1; i < n + 1; i++) {
            for (var j = 1; j < m + 1; j++) {
                if (this.genes[i - 1].site.index === geneplex.genes[j - 1].site.index) {
                    s[i][j] = s[i - 1][j - 1] + 1;
                }
                else {
                    s[i][j] = Math.max(s[i - 1][j], s[i][j - 1]);
                }
            }
        }
        var that = this;
        function recover(i, j) {
            if (i < 1 || j < 1) return [];
            if (that.genes[i - 1].site.index === geneplex.genes[j - 1].site.index) {
                var list = recover(i - 1, j - 1);
                list.push({ i: i - 1, j: j - 1 });
                return list;
            }
            else {
                //if (i === 0) {
                //    return recover(i, j - 1);
                //}
                //if (j === 0) {
                //    return recover(i - 1, j);
                //}
                if (s[i - 1][j] > s[i][j - 1]) {
                    return recover(i - 1, j);
                }
                else {
                    return recover(i, j - 1);
                }
            }
        }

        return { max: s[n][m], list: recover(n, m) };
    }

    Geneplex.prototype.crossover = function (geneplex) {
        // add lcs dp solution here for crossover
        var crosspoints = this.lcs(geneplex);
        var toReturn = (Math.max(this.genes.length, geneplex.genes.length) - crosspoints.max);

        var genes = [];
        var mother = Math.random() > 0.5 ? true : false;
        var i = 0;
        var j = 0;


        mother = Math.random() > 0.5 ? true : false;
        for (var k = 0; k < crosspoints.list.length; k++) {
            if (mother) {
                while (i < crosspoints.list[k].i) {
                    genes.push(this.genes[i++].clone());
                }
                j = crosspoints.list[k].j;
            }
            else {
                while (j < crosspoints.list[k].j) {
                    genes.push(geneplex.genes[j++].clone());
                }
                i = crosspoints.list[k].i;
            }
            mother = Math.random() > 0.5 ? true : false;
        }
        if (mother) {
            while (i < this.genes.length) {
                genes.push(this.genes[i++].clone());
            }
        }
        else {
            while (j < geneplex.genes.length) {
                genes.push(geneplex.genes[j++].clone());
            }
        }
        //console.log(crosspoints);
        //console.log("lcs: " + this.lcs(geneplex).max + " n: " + this.genes.length + " m: " + geneplex.genes.length + " g: " + genes.length);
        //console.log("mindif: " + (Math.min(this.genes.length, geneplex.genes.length) - this.lcs(geneplex).max) +
        //    " parentdif: " + Math.abs(this.genes.length - geneplex.genes.length) + " newdiff: " + Math.min(Math.abs(genes.length-this.genes.length),Math.abs(genes.length - geneplex.genes.length)));
        this.genes = genes;

        this.updateStats();

        return toReturn;
    }

    Geneplex.prototype.clone = function (start, finish) {
        if (!start) start = 0;
        if (!finish) finish = this.genes.length;
        var gp = new Geneplex(this.params);
        gp.genes = [];
        for (var i = start; i < finish; i++) {
            gp.genes.push(this.genes[i].clone());
        }

        gp.updateStats();

        return gp;
    };

    Geneplex.prototype.segment = function (start, reverse, energy) {
        var length = 0;
        var i = start;
        var gene;
        var nextGene;

        var gp = new Memeplex(this.params, this);
        gp.genes = [];

        while (length < energy) {
            if (i === this.genes.length) {
                i = this.genes.length - 2;
                reverse = true;
            }
            if (i < 0) {
                i = 1;
                reverse = false;
            }

            gene = this.genes[i].clone();

            if (reverse) {
                if (i - 1 < 0) nextGene = 1; else nextGene = i - 1;
            } else {
                if (i + 1 === this.genes.length) nextGene = this.genes.length - 2; else nextGene = i + 1;
            }
            gene.start = length;
            gp.genes.push(gene);
            if (!this.genes[nextGene]) {
                console.log(nextGene);
                console.log(this.genes.length);
                return null;
            }
            length += gene.cost() + this.params.map.adjacencymatrix[gene.site.index][this.genes[nextGene].site.index];
            reverse ? i-- : i++;
        }

        gp.updateStats();

        return gp;
    };

    Geneplex.prototype.createMemome = function () {
        var memeplexes = [];
        if (!this.genes || this.genes.length === 0) {
            console.log(this.genes);
            return null;
        }
        else {
            var site = this.genes[0].site.index;
            memeplexes[site] = [];
            memeplexes[site].push(this.segment(0, false, this.params.maxenergy));
            for (var i = 1; i < this.genes.length - 1; i++) {
                site = this.genes[i].site.index;
                if (!memeplexes[site]) memeplexes[site] = [];
                memeplexes[site].push(this.segment(i, false, this.params.maxenergy));
                memeplexes[site].push(this.segment(i, true, this.params.maxenergy));
            }
            site = this.genes[this.genes.length - 1].site.index;
            if (!memeplexes[site]) memeplexes[site] = [];
            memeplexes[site].push(this.segment(this.genes.length - 1, true, this.params.maxenergy));

            //console.log(memeplexes);
            //console.log(this.siteList);

            return new Memome(memeplexes);
        }
    };

    Geneplex.prototype.updateStats = function () {
        this.length = this.getLength();
        this.resources = this.getResources();
        this.siteList = this.getSiteList();
        this.resourcesRatio = this.resources / this.length;
    }

    Geneplex.prototype.getSiteList = function () {
        var siteList = [];
        for (var i = 0; i < this.genes.length; i++) {
            siteList.push(this.genes[i].site.index);
        }
        this.siteList = siteList;
        return siteList;
    }

    Geneplex.prototype.getLength = function () {
        var length = 0;
        var optimized = 0;
        var breedlength = 0;
        var travellength = 0;
        var learnlength = 0;
        var sociallength = 0;

        for (var i = 0; i < this.genes.length; i++) {
            var gene = this.genes[i];
            length += gene.cost();
            optimized += gene.cost() - gene.site.reward;
            var breedcost = gene.breed;
            breedlength += breedcost;
            var learncost = gene.learn;
            learnlength += learncost;
            var socialcost = gene.social;
            sociallength += socialcost;
            length += breedcost + learncost + socialcost;
            if (i + 1 < this.genes.length) {
                if (!this.genes[i + 1].site) { console.log(i + " " + this.genes.length); }
                var travelcost = this.params.map.adjacencymatrix[this.genes[i + 1].site.index][gene.site.index];
                if (travelcost === 0) {
                    console.log("no edge at " + gene.site.index);
                }
                travellength += travelcost;
                length += travelcost;
            }
        }
        //   console.log(length + " " + breedlength + " " + travellength);
        this.breedlength = breedlength;
        this.learnlength = learnlength;
        this.sociallength = sociallength;
        this.travellength = travellength;
        this.length = length;
        this.optimized = optimized;
        return length;
    }

    Geneplex.prototype.getResources = function () {
        var resources = 0;
        for (var i = 0; i < this.genes.length; i++) {
            resources += this.genes[i].reward();
        }
        this.resources = resources;
        return resources;
    }

    var Memeplex = function (params, geneplex) {
        this.geneplex = geneplex;
        this.params = params;
        this.genes = [];
        this.rewind = false;
        this.gene = -1;
        this.gen = 0;

        //console.log(Math.floor(this.length*100)/100 + " " + this.resources + " " + Math.floor(this.resourcesRatio*100)/100);
    }

    Memeplex.prototype.mutate = function () {
        // mutate random genes in the list
        var that = this;
        var toReturn = false;

        function mutation() {
            return Math.random() < that.params.mutationrate + that.learn / that.energy;
        }

        if (mutation()) {
            var cutpoints = [];
            for (var i = 0; i < this.genes.length; i++) {
                if (this.genes[i].learn > 0) cutpoints.push(i);
            }
            if (cutpoints.length > 0) {
                var cut = cutpoints[Math.floor(Math.random() * cutpoints.length)];
                if (Math.random() < 0.5) {
                    // cutoff front
                    this.genes.splice(0, cut);
                } else {
                    // cutoff back
                    this.genes.splice(cut + 1, this.genes.length - cut - 1);
                }

                this.findBestDay(this.params.maxenergy);

                var site = this.genes[this.genes.length - 1].site.index;
                var indexes = [];
                for (var i = 0; i < this.geneplex.genes.length; i++) {
                    if (this.geneplex.genes[i].site.index === site) indexes.push(i);
                }

                var energy = this.params.maxenergy - this.energy;

                var extension = this.geneplex.segment(site, Math.random() < 0.5 ? true : false, energy);

                for (var i = 1; i < extension.genes.length; i++) {
                    this.genes.push(extension.genes[i].clone());
                }

                toReturn = true;
            }
        }
        for (var i = 0; i < this.genes.length; i++) {
            this.genes[i].mutate();
        }

        this.updateStats();

        return toReturn;
    }

    Memeplex.prototype.crossover = function (geneplex) {

    }

    Memeplex.prototype.clone = function (start, finish) {
        if (!start) start = 0;
        if (!finish) finish = this.genes.length;
        var gp = new Memeplex(this.params);
        gp.genes = [];
        gp.gen = this.gen + 1;
        console.log("cloned");
        for (var i = start; i < finish; i++) {
            gp.genes.push(this.genes[i].clone());
        }

        gp.updateStats();

        return gp;
    };

    Memeplex.prototype.findBestDay = function (energy) {
        this.energy = 0;
        this.travel = 0;
        this.reward = 0;
        this.breed = 0;
        this.social = 0;
        this.learn = 0;
        this.extra = 0;
        this.siteList = [];
        this.breedIntervals = [];
        this.socialIntervals = [];
        var i = 0;

        while (i < this.genes.length && this.energy < energy) {
            var gene = this.genes[i];
            var genecost = gene.cost();
            var travelcost = i === this.genes.length - 1 ? 0 : this.params.map.adjacencymatrix[gene.site.index][this.genes[i + 1].site.index];
            var reward = gene.reward();
            // actions at a site are gather then learn then breed then social
            if (gene.breed > 0) this.breedIntervals.push({ start: this.energy - gene.breed - gene.social, end: this.energy - gene.social, site: gene.site.index })
            if (gene.social > 0) this.socialIntervals.push({ start: this.energy - gene.social, end: this.energy, site: gene.site.index })
            if (this.energy + genecost + travelcost < energy) {
                gene.start = this.energy;
                this.siteList.push(gene.site.index);
                this.energy += genecost + travelcost;
                this.travel += travelcost;
                this.reward += reward;
                this.breed += gene.breed;
                this.social += gene.social;
                this.learn += gene.learn;
                this.extra += gene.breed + gene.social + gene.learn + travelcost;
            } else break;
            i++;
        }

        return this;
    };

    Memeplex.prototype.updateStats = function () {
        this.length = this.getLength();
        this.resources = this.getResources();
        this.siteList = this.getSiteList();
        this.resourcesRatio = this.resources / this.length;
    }

    Memeplex.prototype.getSiteList = function () {
        var siteList = [];
        for (var i = 0; i < this.genes.length; i++) {
            siteList.push(this.genes[i].site.index);
        }
        this.siteList = siteList;
        return siteList;
    }

    Memeplex.prototype.getLength = function () {
            var length = 0;
            var optimized = 0;
            var breedlength = 0;
            var travellength = 0;
            var learnlength = 0;
            var sociallength = 0;

            for (var i = 0; i < this.genes.length; i++) {
                var gene = this.genes[i];
                length += gene.cost();
                optimized += gene.cost() - gene.site.reward;
                var breedcost = gene.breed;
                breedlength += breedcost;
                var learncost = gene.learn;
                learnlength += learncost;
                var socialcost = gene.social;
                sociallength += socialcost;
                length += breedcost + learncost + socialcost;
                if (i + 1 < this.genes.length) {
                    if (!this.genes[i + 1].site) { console.log(i + " " + this.genes.length); }
                    var travelcost = this.params.map.adjacencymatrix[this.genes[i + 1].site.index][gene.site.index];
                    if (travelcost === 0) {
                        console.log("no edge at " + gene.site.index);
                    }
                    travellength += travelcost;
                    length += travelcost;
                }
            }
            //   console.log(length + " " + breedlength + " " + travellength);
            this.breedlength = breedlength;
            this.learnlength = learnlength;
            this.sociallength = sociallength;
            this.travellength = travellength;
            this.length = length;
            this.optimized = optimized;
            return length;
        }

    Memeplex.prototype.getResources = function () {
        var resources = 0;
        for (var i = 0; i < this.genes.length; i++) {
            resources += this.genes[i].reward();
        }
        this.resources = resources;
        return resources;
    }

    function Memome(memeplexes) {
        this.memeplexes = memeplexes;
    }

    Memome.prototype.findBestDay = function (site, energy) {
        var memeplexes = this.memeplexes[site];

        if (!memeplexes || memeplexes.length === 0) {
            //console.log(site);
            //console.log(this.memeplexes);
            return { index: -1 };
        }
        var maxReward = 0;
        var minEnergy = 0;
        var mindex = 0;
        for (var index = 0; index < memeplexes.length; index++) {
            memeplexes[index].findBestDay(energy);
            if (memeplexes[index].reward > maxReward || (memeplexes[index].reward === maxReward && memeplexes[index].energy < minEnergy)) {
                maxReward = memeplexes[index].reward;
                minEnergy = memeplexes[index].energy;
                mindex = index;
            }
        }

        var memeplex = memeplexes[mindex].findBestDay(energy);
        //console.log(memeplex.siteList);
        //console.log("Energy: " + memeplex.energy);
        //console.log("Reward: " + memeplex.reward);
        //console.log("Extra: " + memeplex.extra);

        return memeplex;
    }
