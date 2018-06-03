var shoppingList = angular.module('ShoppingList', []);

$("#img-input").on("change", $event => {
	if ($event.target.files && $event.target.files[0]) {
		var reader = new FileReader();

		reader.onload = function(e) {
			let img = document.createElement("IMG");
			img.src=e.target.result;

			$("#img-result").html($(img));
		};

		reader.readAsDataURL($event.target.files[0]);
	}
});


function mainController($scope, $http) {
	$scope.formData = {};

    let refreshInterval = setInterval($scope.getItems, 10000);

	$scope.getItems = function () {
		$http.get('/api/items/'+listId)
				.success(function(data) {
					$scope.items = data.items;
					console.log(data);
				})
				.error(function(data) {
					console.log('Error: ' + data);
				});
	};

	// when landing on the page, get all items and show them
	$scope.getItems();

	$scope.createTodoFrom = function(source) {
		$scope.formData.name = source.name;
        $scope.formData.amount = source.amount || "";
        $scope.formData.art = source.art || "";
		$scope.formData.image = source["image_cam"] || source["image_upl"] || "";
        $scope.createTodo();
    };

	// when submitting the add form, send the text to the node API
	$scope.createTodo = function() {
		if ($scope.formData !== null){
			$scope.formData.list = listId;
			$http.post('/api/items', $scope.formData)
				.success(function(data) {
					$scope.formData = {}; // clear the form so our user is ready to enter another
					$scope.getItems();
				})
				.error(function(data) {
					console.log('Error: ' + data);
				});
		}
		else {
			$scope.formData = {};
		}
	};

	// delete an item after checking it
	$scope.deleteTodo = function(id) {
		$http.delete('/api/items/' + id)
			.success(function(data) {
				$scope.getItems();
			})
			.error(function(data) {
				console.log('Error: ' + data);
			});
	};

    //! annyang
    /*if (annyang && false) { //deactivate annyang
    	console.log("Annyang available");
        // Add our commands to annyang
		annyang.debug();

        annyang.setLanguage("de-DE");
        annyang.addCommands({
            'hallo': function() { alert('Hallo world!'); },
            "guten tag": function() {alert("Dir auch!")},
            ":q :q2 :a :n": addItem,
            "schreib noch :n drauf": function(n){addItem(null, null, null, n)},
			":n hab ich": removeItem,
			"entferne :n": removeItem
        });

		function addItem(q, q2, a, n) {
			if (q && q2 && a) {
				let sa = a.substring(0, a.length - 1),
					se = a.substring(a.length-1, a.length);
				$scope.createTodoFrom({name:n, amount: q+" "+q2, art:(se==="e" ? sa:a)})
			} else {
				$scope.createTodoFrom({name:n})
			}

		}


        function removeItem(n) {
        	console.log(n);
        	console.log($scope.items.filter(function (o) {return o.name === n}));
            $scope.deleteTodo($scope.items.filter(function (o) {return o.name === n})[0]._id)
		}

        // Tell KITT to use annyang
        SpeechKITT.annyang();

        // Define a stylesheet for KITT to use
        SpeechKITT.setStylesheet('/static/stylesheets/annyang-listx.css');

        SpeechKITT.setInstructionsText('Einfach ausprobieren');
        SpeechKITT.setSampleCommands(['Füge 2 Liter fettarme Milch hinzu', 'Schreib noch Äpfel drauf']);
        // Render KITT's interface
        SpeechKITT.vroom();
    }
*/


}