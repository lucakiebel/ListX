var shoppingList = angular.module('ShoppingList', []);


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
    if (annyang) {
    	console.log("Annyang available");
        // Add our commands to annyang
		annyang.debug();

        annyang.setLanguage("de-DE");
        annyang.addCommands({
            'hallo': function() { alert('Hallo world!'); },
            "guten tag": function() {alert("Ihnen auch!")},
            "füge :q :q2 :a :n hinzu": function (q,q2,a,n){$scope.createTodoFrom({name:n, amount: q+" "+q2, art:a.substring(0, a.length - 1)})},
            "schreib noch :n drauf": function(n){$scope.createTodoFrom({name:n})},
			":n hab ich": removeItem,
			"entferne :n": removeItem
        });


        function removeItem(n) {
        	console.log(n);
        	console.log($scope.items.filter(function (o) {return o.name === n}));
            $scope.deleteTodo($scope.items.filter(function (o) {return o.name === n})[0]._id)
		}

        // Tell KITT to use annyang
        SpeechKITT.annyang();

        // Define a stylesheet for KITT to use
        SpeechKITT.setStylesheet('/stylesheets/annyang-listx.css');

        SpeechKITT.setInstructionsText('Einfach ausprobieren');
        SpeechKITT.setSampleCommands(['Füge 2 Liter fettarme Milch hinzu', 'Schreib noch Äpfel drauf']);
        // Render KITT's interface
        SpeechKITT.vroom();
    }



}